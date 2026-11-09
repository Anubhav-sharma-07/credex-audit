import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { parseAndValidateBody } from "@/modules/security/request_validation";
import { checkRateLimit, createRateLimitResponse, ROUTE_RATE_LIMITS, getClientIp } from "@/modules/security/rate_limiter";
import { isEmailUnsubscribed } from "@/modules/security/retention";
import { recordAuditLog } from "@/modules/security/audit_log";

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

  try {
    const { error } = await supabase.from("leads").insert({
      audit_id: data.auditId,
      email: data.email,
      company_name: data.companyName || null,
      role: data.role || null,
      team_size: data.teamSize || null,
    });

    if (error) {
      console.error(`[LEAD_PERSIST_ERROR] [${requestId}]:`, error.message);
      // Fallback in demo without failing the user
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
    console.error(`[LEAD_ERROR] [${requestId}]:`, msg);
    return NextResponse.json({ error: "Failed to process lead request", requestId }, { status: 500 });
  }
}
