import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSubscription } from "@/modules/workspace/subscriptions";
import { TOOL_LABELS, PLAN_LABELS } from "@/lib/pricing";
import { parseAndValidateBody } from "@/modules/security/request_validation";
import { checkRateLimit, createRateLimitResponse, ROUTE_RATE_LIMITS, getClientIp } from "@/modules/security/rate_limiter";
import { markAuditClaimed } from "@/modules/security/retention";
import { recordAuditLog } from "@/modules/security/audit_log";
import { getSessionUser, requireWorkspaceMember, getUserWorkspace } from "@/lib/auth/server";
import { assertMutationCsrfAndOrigin } from "@/modules/security/csrf";
import { captureException } from "@/lib/sentry";

const ClaimAuditSchema = z.object({
  auditId: z.string().max(100).optional(),
  workspaceId: z.string().max(100).optional(),
  teamSize: z.number().int().min(1).max(10000).default(4),
  toolResults: z.array(
    z.object({
      tool: z.string().max(50),
      plan: z.string().max(50),
      currentMonthlySpend: z.number().min(0),
      projectedMonthlyCost: z.number().min(0).optional(),
      monthlySavings: z.number().min(0).optional(),
      reason: z.string().max(500).optional(),
    })
  ).min(1).max(50),
}).strict();

export async function POST(request: NextRequest) {
  // 1. Rate Limiting Check
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, "claim_audit_api", ROUTE_RATE_LIMITS.claimAudit);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  // 2. Authentication Check
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Active session required to claim an audit into a workspace." },
      { status: 401 }
    );
  }

  // 3. Strict CSRF & Origin Verification on State Mutation
  const csrfCheck = assertMutationCsrfAndOrigin(request, user);
  if (!csrfCheck.allowed) {
    return csrfCheck.errorResponse!;
  }

  // 4. Size Limit & Strict Schema Validation
  const validation = await parseAndValidateBody(request, ClaimAuditSchema, {
    maxSizeBytes: 64 * 1024,
    routeContext: "api/workspace/claim-audit",
  });

  if (!validation.success) {
    return validation.response;
  }

  const { data, requestId } = validation;

  try {
    let targetWorkspaceId = data.workspaceId;
    if (!targetWorkspaceId) {
      const userWs = await getUserWorkspace(user.id);
      targetWorkspaceId = userWs?.workspaceId || "00000000-0000-0000-0000-000000000001";
    }

    // Enforce workspace membership with write permission
    await requireWorkspaceMember(targetWorkspaceId, ["owner", "admin", "finance", "member"]);

    const { teamSize, toolResults, auditId } = data;
    const createdSubs = [];

    for (const tool of toolResults) {
      const vendorName = TOOL_LABELS[tool.tool as keyof typeof TOOL_LABELS] || tool.tool;
      const planName = PLAN_LABELS[tool.plan as keyof typeof PLAN_LABELS] || tool.plan;

      const sub = await createSubscription(targetWorkspaceId, {
        vendorName,
        toolId: tool.tool.toLowerCase().replace(/\s+/g, "_"),
        planName,
        category: "ide_assistant",
        seats: teamSize,
        costMinor: Math.round(tool.currentMonthlySpend * 100),
        currency: "USD",
        billingFrequency: "monthly",
        decisionStatus: (tool.monthlySavings && tool.monthlySavings > 0) ? "review" : "keep",
        notes: tool.reason ? `Imported from audit: ${tool.reason}` : "Imported from anonymous audit calculation",
      });

      createdSubs.push(sub);
    }

    if (auditId) {
      markAuditClaimed(auditId);
    }

    await recordAuditLog({
      workspaceId: targetWorkspaceId,
      actorId: user.id,
      actorEmail: user.email,
      action: "csv_import",
      targetId: auditId || "direct_audit_claim",
      ipAddress: clientIp,
      userAgent: (request as unknown as { headers: Headers }).headers.get("user-agent") || "unknown",
      metadata: { importedCount: createdSubs.length, source: "anonymous_audit_claim" },
    });

    return NextResponse.json({
      success: true,
      importedCount: createdSubs.length,
      workspaceId: targetWorkspaceId,
      subscriptions: createdSubs,
      requestId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to claim audit";
    captureException(err, {
      route: "api/workspace/claim-audit",
      userId: user.id,
      extra: { requestId },
    });
    console.error(`[CLAIM_AUDIT_ERROR] [${requestId}]:`, msg);
    return NextResponse.json(
      { error: msg, requestId },
      { status: msg.includes("Access denied") || msg.includes("Forbidden") ? 403 : 500 }
    );
  }
}
