import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hardDeleteWorkspace } from "@/modules/security/retention";
import { recordAuditLog } from "@/modules/security/audit_log";
import { parseAndValidateBody } from "@/modules/security/request_validation";
import { getClientIp } from "@/modules/security/rate_limiter";
import { getSessionUser, requireWorkspaceMember } from "@/lib/auth/server";
import { assertMutationCsrfAndOrigin } from "@/modules/security/csrf";
import { captureException } from "@/lib/sentry";

const DeleteWorkspaceSchema = z.object({
  workspaceId: z.string().min(1).max(100),
  confirmationText: z.string().optional(),
  confirmation: z.string().optional(),
}).strict();

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  // 1. Authenticate Caller
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Active session required to delete a workspace." },
      { status: 401 }
    );
  }

  // 2. Strict CSRF & Origin Verification on State Mutation
  const csrfCheck = assertMutationCsrfAndOrigin(request, user);
  if (!csrfCheck.allowed) {
    return csrfCheck.errorResponse!;
  }

  const validation = await parseAndValidateBody(request, DeleteWorkspaceSchema, {
    maxSizeBytes: 16 * 1024,
    routeContext: "api/workspace/delete",
  });

  if (!validation.success) {
    return validation.response;
  }

  const { data, requestId } = validation;
  const text = data.confirmationText || data.confirmation || "";

  if (text !== `DELETE ${data.workspaceId}`) {
    return NextResponse.json(
      { error: `Confirmation mismatch. Must type: DELETE ${data.workspaceId}`, requestId },
      { status: 400 }
    );
  }

  try {
    // 2. Enforce Owner Role via Database RLS
    const { role: callerRole } = await requireWorkspaceMember(data.workspaceId, ["owner"]);

    const result = await hardDeleteWorkspace(data.workspaceId, callerRole);

    await recordAuditLog({
      workspaceId: data.workspaceId,
      actorId: user.id,
      actorEmail: user.email,
      action: "workspace_delete",
      targetId: data.workspaceId,
      ipAddress: clientIp,
      userAgent: request.headers.get("user-agent") || "unknown",
      metadata: { deletedAt: result.deletedAt },
    });

    return NextResponse.json({
      success: true,
      message: `Workspace ${data.workspaceId} permanently deleted. All data purged.`,
      deletedAt: result.deletedAt,
      requestId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to purge workspace";
    captureException(error, {
      route: "api/workspace/delete",
      workspaceId: data.workspaceId,
      userId: user.id,
      extra: { requestId },
    });
    console.error(`[WORKSPACE_DELETE_ERROR] [${requestId}]:`, message);
    return NextResponse.json(
      { error: message, requestId },
      { status: message.includes("Access denied") || message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
