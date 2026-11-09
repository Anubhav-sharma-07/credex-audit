import { NextResponse } from "next/server";
import { z } from "zod";
import { answerAIQuestion } from "@/modules/ai";
import { listSubscriptions } from "@/modules/workspace/subscriptions";
import { runAuditEngine } from "@/modules/audit";
import type { ToolId } from "@/modules/audit/types";
import { parseAndValidateBody } from "@/modules/security/request_validation";
import { checkRateLimit, createRateLimitResponse, ROUTE_RATE_LIMITS, getClientIp } from "@/modules/security/rate_limiter";

const QuestionRequestSchema = z.object({
  questionType: z.enum([
    "spend_analysis",
    "vendor_comparison",
    "renewals",
    "budgets",
    "savings",
  ]),
}).strict();

export async function POST(request: Request) {
  // 1. Rate Limiting Check
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, "insights_api", ROUTE_RATE_LIMITS.insights);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  // 2. Size Limit & Strict Schema Validation
  const validation = await parseAndValidateBody(request, QuestionRequestSchema, {
    maxSizeBytes: 32 * 1024,
    routeContext: "api/insights",
  });

  if (!validation.success) {
    return validation.response;
  }

  const { data, requestId } = validation;

  try {
    const { questionType } = data;
    const workspaceId = "ws_default";
    const userId = "usr_current_user";

    // 1. Fetch workspace subscriptions
    const subResult = await listSubscriptions(workspaceId, { pageSize: 100 });
    const subscriptions = subResult.data;

    // 2. Run deterministic audit engine to produce structured findings
    const engineResult = runAuditEngine({
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        toolId: s.toolId as ToolId,
        planId: s.planName.toLowerCase(),
        seats: s.seats,
        actualMonthlySpendMinor: s.costMinor,
        billingCycle: s.billingFrequency,
        ownerEmail: s.ownerEmail,
        renewalDate: s.renewalDate,
      })),
      teamSize: 4,
      useCase: "coding",
      referenceDate: new Date().toISOString(),
    });

    const totalMonthlySpendMinor = subscriptions.reduce((acc, s) => acc + s.costMinor, 0);

    const structuredFindings = engineResult.findings.map((f) => ({
      id: f.id,
      ruleId: f.ruleId,
      toolId: f.toolId,
      toolName: f.toolId.charAt(0).toUpperCase() + f.toolId.slice(1).replace(/_/g, " "),
      kind: f.kind,
      currentMonthlyUsd: f.currentMonthlyMinor / 100,
      projectedMonthlyUsd: f.projectedMonthlyMinor / 100,
      savingsMonthlyUsd: f.savingsMinor / 100,
      confidence: f.confidence,
      evidenceSummary: f.evidence,
      assumptions: f.assumptions,
      pricingSource: f.pricingSource,
    }));

    // 3. Ask AI layer with strict read-only finding citations
    const result = await answerAIQuestion({
      workspaceId,
      userId,
      questionType,
      findings: structuredFindings,
      monthlySpendUsd: totalMonthlySpendMinor / 100,
      monthlySavingsUsd: engineResult.forecast.monthlySavingsMinor / 100,
      teamSize: 4,
    });

    return NextResponse.json({
      answer: result.answer,
      citedFindingIds: result.citedFindingIds,
      findings: engineResult.findings,
      isFallback: result.isFallback,
      meta: result.meta,
      requestId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error generating AI insights";
    console.error(`[INSIGHTS_ERROR] [${requestId}]:`, message);
    return NextResponse.json(
      { error: "Failed to generate AI insights", requestId },
      { status: 500 }
    );
  }
}
