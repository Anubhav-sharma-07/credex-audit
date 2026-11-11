import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { answerAIQuestion, type StructuredFindingInput } from "@/modules/ai";
import { defaultAIRateLimiter } from "@/modules/ai/rate_limiter";
import { parseAndValidateBody } from "@/modules/security/request_validation";
import { checkRateLimitAsync, createRateLimitResponse, ROUTE_RATE_LIMITS, getClientIp } from "@/modules/security/rate_limiter";
import { getSessionUser, getUserWorkspace } from "@/lib/auth/server";
import { captureException } from "@/lib/sentry";

// Client cannot supply or spoof userId/workspaceId to bypass AI cost caps
const SummaryRequestSchema = z.object({
  teamSize: z.number().int().min(1).max(10000).default(1),
  useCase: z.string().max(100).optional(),
  totalMonthlySpend: z.number().min(0).default(0),
  totalMonthlySavings: z.number().min(0).default(0),
  totalAnnualSavings: z.number().min(0).default(0),
  tools: z.array(
    z.object({
      tool: z.string().max(50),
      plan: z.string().max(50),
      monthlySpend: z.number().min(0).optional(),
      currentMonthlySpend: z.number().min(0).optional(),
    })
  ).min(1).max(50),
}).strict();

export async function POST(request: NextRequest) {
  // 1. IP-level Rate Limiting Check (Distributed via Upstash if configured)
  const clientIp = getClientIp(request);
  const rateLimit = await checkRateLimitAsync(clientIp, "summary_api", ROUTE_RATE_LIMITS.summary);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  // 2. Size Limit & Strict Schema Validation
  const validation = await parseAndValidateBody(request, SummaryRequestSchema, {
    maxSizeBytes: 64 * 1024,
    routeContext: "api/summary",
  });

  if (!validation.success) {
    return validation.response;
  }

  const { data, requestId } = validation;

  // 3. Resolve authoritative user & workspace (Strictly immune to client body spoofing)
  let resolvedUserId: string;
  let resolvedWorkspaceId: string;

  try {
    const sessionUser = await getSessionUser();
    if (sessionUser) {
      resolvedUserId = sessionUser.id;
      const userWs = await getUserWorkspace(sessionUser.id);
      resolvedWorkspaceId = userWs?.workspaceId || "00000000-0000-0000-0000-000000000001";
    } else {
      // Unauthenticated public audit summary: key strictly on the client IP
      resolvedUserId = `anon_${clientIp}`;
      resolvedWorkspaceId = `public_${clientIp}`;
    }

    // 4. Enforce AI Rate Limiting & Daily Cost Caps keyed on authoritative identities
    const aiRateCheck = await defaultAIRateLimiter.checkRateLimitDistributed(
      resolvedUserId,
      resolvedWorkspaceId
    );

    if (!aiRateCheck.allowed) {
      return NextResponse.json(
        {
          error: aiRateCheck.reason || "AI rate limit exceeded.",
          summary:
            "Deterministic audit calculations verified. AI rate limit reached; review recommendations below for specific ways to tighten plan fit.",
          requestId,
        },
        { status: 429 }
      );
    }

    const tools = data.tools;
    const teamSize = data.teamSize;
    const monthlySpendUsd = data.totalMonthlySpend;
    const monthlySavingsUsd = data.totalMonthlySavings;

    // Convert tools into structured findings for the AI layer
    const structuredFindings: StructuredFindingInput[] = tools.map((t, idx) => {
      const spend = t.currentMonthlySpend ?? t.monthlySpend ?? 0;
      return {
        id: `finding_${t.tool}_${idx}`,
        ruleId: "plan_optimization",
        toolId: t.tool,
        toolName: t.tool.charAt(0).toUpperCase() + t.tool.slice(1).replace(/_/g, " "),
        kind: "plan_optimization",
        currentMonthlyUsd: spend,
        projectedMonthlyUsd: spend,
        savingsMonthlyUsd: 0,
        confidence: "confirmed",
        evidenceSummary: [`Active plan: ${t.plan}`, `Reported spend: $${spend}/mo`],
      };
    });

    const aiResult = await answerAIQuestion({
      workspaceId: resolvedWorkspaceId,
      userId: resolvedUserId,
      questionType: "spend_analysis",
      findings: structuredFindings,
      monthlySpendUsd,
      monthlySavingsUsd,
      teamSize,
    });

    // Record usage cost against the authoritative workspace
    const estimatedCost = aiResult.meta.tokenCount ? (aiResult.meta.tokenCount / 1000) * 0.002 : 0.001;
    defaultAIRateLimiter.recordCost(resolvedWorkspaceId, estimatedCost);

    return NextResponse.json({
      summary: aiResult.answer,
      isFallback: aiResult.isFallback,
      meta: aiResult.meta,
      requestId,
    });
  } catch (err: unknown) {
    captureException(err, { route: "api/summary", extra: { requestId } });
    const msg = err instanceof Error ? err.message : "Error generating summary";
    console.error(`[SUMMARY_ERROR] [${requestId}]:`, msg);
    return NextResponse.json({
      summary:
        "Deterministic audit complete. Review recommendations below for specific ways to tighten plan fit and consolidate overlapping tools.",
      requestId,
    });
  }
}
