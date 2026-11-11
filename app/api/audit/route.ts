import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { parseAndValidateBody } from "@/modules/security/request_validation";
import { checkRateLimit, createRateLimitResponse, ROUTE_RATE_LIMITS, getClientIp } from "@/modules/security/rate_limiter";
import { trackAnonymousAudit } from "@/modules/security/retention";

const AuditToolItemSchema = z.object({
  tool: z.string().max(50),
  plan: z.string().max(50).optional().default("default"),
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

interface SupabaseClient {
  from: (table: string) => {
    insert: (values: Record<string, unknown>) => {
      single: () => Promise<{ data: { id: string } | null; error: Error | null }>;
    };
  };
}

function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    if (typeof globalThis.WebSocket === "undefined") {
      globalThis.WebSocket = class DummyWebSocket {} as unknown as typeof WebSocket;
    }
    return createClient(url, key, { auth: { persistSession: false } }) as unknown as SupabaseClient;
  }
  return {
    from: () => ({
      insert: () => ({
        single: async () => ({ data: { id: `aud_${Date.now()}` }, error: null }),
      }),
    }),
  } as unknown as SupabaseClient;
}

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
    // Recompute and verify financial totals server-side (never blindly store client-supplied totals)
    const verifiedMonthlySpend = data.tools.reduce(
      (sum, t) => sum + (t.monthlySpend ?? t.currentMonthlySpend ?? 0),
      0
    );
    const verifiedMonthlySavings = Math.min(
      data.totalMonthlySavings,
      verifiedMonthlySpend
    );
    const verifiedAnnualSavings = verifiedMonthlySavings * 12;

    const supabase = getSupabaseClient();
    const { data: record, error } = await supabase.from("audits").insert({
      tool_results: data.tools,
      summary: data.summary || data.aiSummary || "",
      team_size: data.teamSize,
      use_case: data.useCase,
      total_monthly_spend: verifiedMonthlySpend,
      total_monthly_savings: verifiedMonthlySavings,
      total_annual_savings: verifiedAnnualSavings,
    }).single();

    if (error) {
      console.error(`[AUDIT_PERSIST_ERROR] [${requestId}]:`, error.message);
      return NextResponse.json({ error: "Failed to persist audit snapshot", requestId }, { status: 500 });
    }

    const auditId = record?.id || `aud_${Date.now()}`;
    trackAnonymousAudit(auditId, data.teamSize);

    return NextResponse.json({ id: auditId, token: auditId, requestId }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal audit error";
    console.error(`[AUDIT_ERROR] [${requestId}]:`, msg);
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
