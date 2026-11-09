import { NextResponse } from "next/server";
import { z } from "zod";
import { createSubscription } from "@/modules/workspace/subscriptions";
import { TOOL_LABELS, PLAN_LABELS } from "@/lib/pricing";
import { parseAndValidateBody } from "@/modules/security/request_validation";
import { checkRateLimit, createRateLimitResponse, ROUTE_RATE_LIMITS, getClientIp } from "@/modules/security/rate_limiter";
import { markAuditClaimed } from "@/modules/security/retention";
import { recordAuditLog } from "@/modules/security/audit_log";

const ClaimAuditSchema = z.object({
  auditId: z.string().max(100).optional(),
  workspaceId: z.string().max(100).default("ws_default"),
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

export async function POST(request: Request) {
  // 1. Rate Limiting Check
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, "claim_audit_api", ROUTE_RATE_LIMITS.claimAudit);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  // 2. Size Limit & Strict Schema Validation
  const validation = await parseAndValidateBody(request, ClaimAuditSchema, {
    maxSizeBytes: 64 * 1024,
    routeContext: "api/workspace/claim-audit",
  });

  if (!validation.success) {
    return validation.response;
  }

  const { data, requestId } = validation;

  try {
    const { workspaceId, teamSize, toolResults, auditId } = data;
    const createdSubs = [];

    for (const tool of toolResults) {
      const isIde = ["cursor", "copilot", "github_copilot", "windsurf"].includes(tool.tool.toLowerCase());
      const category = isIde ? "ide_assistant" : "chat_assistant";

      const vendorName = (TOOL_LABELS as Record<string, string>)[tool.tool] || tool.tool;
      const planName = (PLAN_LABELS as Record<string, string>)[tool.plan] || tool.plan;

      const sub = await createSubscription(workspaceId, {
        vendorName,
        planName,
        category,
        seats: teamSize,
        costMinor: Math.round(tool.currentMonthlySpend * 100),
        billingFrequency: "monthly",
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        ownerEmail: "admin@spendlens.demo",
        decisionStatus: (tool.monthlySavings || 0) > 0 ? "review" : "keep",
        notes: `Converted from public audit. Projected monthly savings: $${(tool.monthlySavings || 0).toFixed(2)}/mo.`,
      });
      createdSubs.push(sub);
    }

    if (auditId) {
      markAuditClaimed(auditId);
    }

    // Record sensitive operation in audit log
    await recordAuditLog({
      workspaceId,
      actorId: "usr_lead_dev",
      actorEmail: "admin@spendlens.demo",
      action: "subscription_create",
      targetId: auditId || "claimed_audit_batch",
      ipAddress: clientIp,
      userAgent: request.headers.get("user-agent") || "unknown",
      metadata: { convertedCount: createdSubs.length, toolCount: toolResults.length },
    });

    return NextResponse.json({
      success: true,
      convertedCount: createdSubs.length,
      subscriptions: createdSubs,
      requestId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to convert audit into workspace subscriptions";
    console.error(`[CLAIM_AUDIT_ERROR] [${requestId}]:`, message);
    return NextResponse.json(
      { error: "Failed to claim audit into workspace", requestId },
      { status: 500 }
    );
  }
}
