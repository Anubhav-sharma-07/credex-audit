import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { answerAIQuestion } from "@/modules/ai";
import { listSubscriptions } from "@/modules/workspace/subscriptions";
import { runAuditEngine } from "@/modules/audit";
import type { ToolId } from "@/modules/audit/types";
import { parseAndValidateBody } from "@/modules/security/request_validation";
import { checkRateLimit, createRateLimitResponse, ROUTE_RATE_LIMITS, getClientIp } from "@/modules/security/rate_limiter";
import { getSessionUser, requireWorkspaceMember, getUserWorkspace } from "@/lib/auth/server";
import { assertMutationCsrfAndOrigin } from "@/modules/security/csrf";
import { captureException } from "@/lib/sentry";

const QuestionRequestSchema = z.object({
  workspaceId: z.string().optional(),
  questionType: z.enum([
    "spend_analysis",
    "vendor_comparison",
    "renewals",
    "budgets",
    "savings",
  ]),
}).strict();

export async function POST(request: NextRequest) {
  // 1. Rate Limiting Check
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, "insights_api", ROUTE_RATE_LIMITS.insights);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  // 2. Authentication Check
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Active session required to generate AI insights." },
      { status: 401 }
    );
  }

  // 3. Strict CSRF & Origin Verification on State Mutation
  const csrfCheck = assertMutationCsrfAndOrigin(request, user);
  if (!csrfCheck.allowed) {
    return csrfCheck.errorResponse!;
  }

  // 4. Size Limit & Strict Schema Validation
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
    
    // Resolve workspace and enforce tenant membership
    let targetWorkspaceId = data.workspaceId;
    if (!targetWorkspaceId) {
      const userWs = await getUserWorkspace(user.id);
      targetWorkspaceId = userWs?.workspaceId || "00000000-0000-0000-0000-000000000001";
    }

    await requireWorkspaceMember(targetWorkspaceId, [
      "owner",
      "admin",
      "finance",
      "member",
      "viewer",
    ]);

    // 1. Fetch workspace subscriptions
    const subResult = await listSubscriptions(targetWorkspaceId, { pageSize: 100 });
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
      workspaceId: targetWorkspaceId,
      userId: user.id,
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
    captureException(error, {
      route: "api/insights",
      userId: user.id,
      extra: { requestId },
    });
    console.error(`[INSIGHTS_ERROR] [${requestId}]:`, message);
    return NextResponse.json(
      { error: message || "Failed to generate AI insights", requestId },
      { status: error instanceof Error && error.message.includes("Access denied") ? 403 : 500 }
    );
  }
}
