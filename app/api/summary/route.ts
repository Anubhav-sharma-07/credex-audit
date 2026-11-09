import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { answerAIQuestion, type StructuredFindingInput } from "@/modules/ai";
import { parseAndValidateBody } from "@/modules/security/request_validation";
import { checkRateLimit, createRateLimitResponse, ROUTE_RATE_LIMITS, getClientIp } from "@/modules/security/rate_limiter";

const SummaryRequestSchema = z.object({
  workspaceId: z.string().max(100).optional(),
  userId: z.string().max(100).optional(),
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
  // 1. Rate Limiting Check
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, "summary_api", ROUTE_RATE_LIMITS.summary);
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

  try {
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
      workspaceId: data.workspaceId || "public-audit",
      userId: data.userId || "anonymous",
      questionType: "spend_analysis",
      findings: structuredFindings,
      monthlySpendUsd,
      monthlySavingsUsd,
      teamSize,
    });

    return NextResponse.json({
      summary: aiResult.answer,
      isFallback: aiResult.isFallback,
      meta: aiResult.meta,
      requestId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error generating summary";
    console.error(`[SUMMARY_ERROR] [${requestId}]:`, msg);
    return NextResponse.json({
      summary:
        "Deterministic audit complete. Review recommendations below for specific ways to tighten plan fit and consolidate overlapping tools.",
      requestId,
    });
  }
}
