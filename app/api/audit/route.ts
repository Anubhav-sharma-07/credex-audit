import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseAndValidateBody } from "@/modules/security/request_validation";
import { checkRateLimit, createRateLimitResponse, ROUTE_RATE_LIMITS, getClientIp } from "@/modules/security/rate_limiter";
import { trackAnonymousAudit } from "@/modules/security/retention";
import { getAuditRepository } from "@/modules/audit/repository";
import { createClient } from "@supabase/supabase-js";

const AuditToolItemSchema = z.object({
  tool: z.string().min(1).max(100),
  plan: z.string().min(1).max(100).optional().default("default"),
  monthlySpend: z.number().min(0).optional(),
  currentMonthlySpend: z.number().min(0).optional(),
  seats: z.number().int().min(0).optional(),
  recommendedAction: z.string().max(100).optional(),
  projectedMonthlyCost: z.number().min(0).optional(),
  monthlySavings: z.number().min(0).optional(),
  annualSavings: z.number().min(0).optional(),
  reason: z.string().max(1000).optional(),
});

const AuditRequestSchema = z.object({
  teamSize: z.number().int().min(1).max(10000).default(4),
  useCase: z.string().max(100).default("coding"),
  totalMonthlySpend: z.number().min(0).default(0),
  totalMonthlySavings: z.number().min(0).default(0),
  totalAnnualSavings: z.number().min(0).default(0),
  summary: z.string().max(5000).optional(),
  aiSummary: z.string().max(5000).optional(),
  tools: z.array(AuditToolItemSchema).min(1).max(50),
}).strict();

export async function POST(request: NextRequest) {
  // 1. Rate Limiting Check
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, "audit_api", ROUTE_RATE_LIMITS.audit);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  // 2. Size Limit & Strict Schema Validation
  const validation = await parseAndValidateBody(request, AuditRequestSchema, {
    maxSizeBytes: 64 * 1024,
    routeContext: "api/audit",
  });

  if (!validation.success) {
    return validation.response;
  }

  const { data, requestId } = validation;

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    let supabaseClient = undefined;

    if (url && key && !url.includes("placeholder")) {
      if (typeof globalThis.WebSocket === "undefined") {
        globalThis.WebSocket = class DummyWebSocket {} as unknown as typeof WebSocket;
      }
      supabaseClient = createClient(url, key, { auth: { persistSession: false } });
    }

    const repo = getAuditRepository(supabaseClient);

    // Run authoritative server calculation & persist
    const result = await repo.create({
      teamSize: data.teamSize,
      useCase: data.useCase,
      tools: data.tools,
      summary: data.summary || data.aiSummary,
    });

    trackAnonymousAudit(result.id, data.teamSize);

    return NextResponse.json({
      id: result.id,
      shareToken: result.shareToken,
      token: result.shareToken,
      totals: {
        totalMonthlySpend: result.record.totalMonthlySpend,
        totalMonthlySavings: result.record.totalMonthlySavings,
        totalAnnualSavings: result.record.totalAnnualSavings,
      },
      requestId,
    }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal audit error";
    console.error(`[AUDIT_ERROR] [${requestId}]:`, msg);
    return NextResponse.json({ error: "Failed to persist audit snapshot", requestId }, { status: 500 });
  }
}
