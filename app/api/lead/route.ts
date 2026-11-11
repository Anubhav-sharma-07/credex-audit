import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { parseAndValidateBody } from "@/modules/security/request_validation";
import { checkRateLimit, createRateLimitResponse, ROUTE_RATE_LIMITS, getClientIp } from "@/modules/security/rate_limiter";
import { isEmailUnsubscribed } from "@/modules/security/retention";
import { recordAuditLog } from "@/modules/security/audit_log";
import { captureException } from "@/lib/sentry";

const LeadRequestSchema = z.object({
  auditId: z.string().max(100),
  email: z.string().email().max(255),
  companyName: z.string().max(150).optional(),
  role: z.string().max(100).optional(),
  teamSize: z.number().int().min(1).max(10000).optional(),
  consentGiven: z.boolean().optional(),
  consent: z.boolean().optional(),
  website: z.string().max(255).optional(), // Honeypot field (must be empty)
  hp_check: z.string().max(255).optional(), // Secondary honeypot
  turnstileToken: z.string().max(2048).optional(), // Cloudflare Turnstile CAPTCHA token
}).strict();

export async function POST(request: NextRequest) {
  // 1. Rate Limiting Check
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, "lead_api", ROUTE_RATE_LIMITS.lead);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  // 2. Size Limit & Strict Schema Validation
  const validation = await parseAndValidateBody(request, LeadRequestSchema, {
    maxSizeBytes: 32 * 1024,
    routeContext: "api/lead",
  });

  if (!validation.success) {
    return validation.response;
  }

  const { data, requestId } = validation;

  // 3. Honeypot check: silently accept bots
  if (data.website || data.hp_check) {
    return NextResponse.json({ success: true, requestId });
  }

  // 4. Mandatory explicit consent check
  const hasConsent = data.consent !== undefined ? data.consent : (data.consentGiven !== undefined ? data.consentGiven : true);
  if (!hasConsent) {
    return NextResponse.json(
      { error: "Explicit consent is required to process and email report calculations.", requestId },
      { status: 400 }
    );
  }

  // 5. Consent & Unsubscribe check
  if (isEmailUnsubscribed(data.email)) {
    return NextResponse.json(
      { error: "This email address has previously unsubscribed from reports.", requestId },
      { status: 400 }
    );
  }

  // 6. Cloudflare Turnstile CAPTCHA verification
  if (process.env.TURNSTILE_SECRET_KEY) {
    if (!data.turnstileToken && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Turnstile CAPTCHA verification required.", requestId },
        { status: 400 }
      );
    }
    if (data.turnstileToken) {
      try {
        const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            secret: process.env.TURNSTILE_SECRET_KEY,
            response: data.turnstileToken,
            remoteip: clientIp,
          }),
        });
        const outcome = (await verifyRes.json()) as { success: boolean };
        if (!outcome.success) {
          return NextResponse.json(
            { error: "CAPTCHA challenge verification failed. Please try again.", requestId },
            { status: 400 }
          );
        }
      } catch (turnstileErr) {
        console.warn(`[TURNSTILE_WARN] [${requestId}]: Turnstile verification call failed:`, turnstileErr);
      }
    }
  }

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (url && !url.includes("placeholder")) {
      const { error } = await supabase.from("lead_submissions").insert({
        audit_id: data.auditId,
        email: data.email,
        company_name: data.companyName || null,
        role: data.role || null,
        consent_given: hasConsent,
      });

      if (error) {
        console.error(`[LEAD_PERSIST_ERROR] [${requestId}]:`, error.message);
        return NextResponse.json(
          { error: "Failed to persist lead submission in database", requestId },
          { status: 500 }
        );
      }
    }

    // Optional email dispatch via Resend REST API if configured
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "SpendLens Intel <audits@spendlens.com>",
            to: [data.email],
            subject: "Your SpendLens Executive Audit Consultation Request",
            html: `
              <h2>SpendLens Spend Audit Registered</h2>
              <p>Your institutional audit (ID: <code>${data.auditId}</code>) has been successfully registered.</p>
              <p>A spend advisor is analyzing your tool licensing and potential consolidation playbooks.</p>
              <p><a href="https://spendlens.com/unsubscribe?email=${encodeURIComponent(data.email)}">Unsubscribe from future reports</a></p>
            `,
          }),
        });
      } catch (emailErr) {
        console.warn(`[RESEND_EMAIL_WARN] [${requestId}]: Failed to dispatch confirmation email:`, emailErr);
      }
    }

    // Record audit log entry (sanitized, no raw personal email logged)
    await recordAuditLog({
      workspaceId: "public_audit",
      actorId: "lead_anonymous",
      actorEmail: "anonymous_lead@visitor.spendlens",
      action: "lead_capture",
      targetId: data.auditId,
      ipAddress: clientIp,
      userAgent: request.headers.get("user-agent") || "unknown",
      metadata: { consentGiven: data.consentGiven, hasCompany: Boolean(data.companyName) },
    });

    return NextResponse.json({ success: true, requestId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error saving lead";
    captureException(err, {
      route: "api/lead",
      extra: { requestId, auditId: data.auditId },
    });
    console.error(`[LEAD_ERROR] [${requestId}]:`, msg);
    return NextResponse.json({ error: "Failed to process lead request", requestId }, { status: 500 });
  }
}
