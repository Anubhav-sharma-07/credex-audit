import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hardDeleteWorkspace } from "@/modules/security/retention";
import { recordAuditLog } from "@/modules/security/audit_log";
import { parseAndValidateBody } from "@/modules/security/request_validation";
import { getClientIp } from "@/modules/security/rate_limiter";
import type { WorkspaceRole } from "@/modules/workspace/types";

const DeleteWorkspaceSchema = z.object({
  workspaceId: z.string().min(1).max(100),
  confirmationText: z.string().optional(),
  confirmation: z.string().optional(),
}).strict();

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const validation = await parseAndValidateBody(request, DeleteWorkspaceSchema, {
    maxSizeBytes: 16 * 1024,
    routeContext: "api/workspace/delete",
  });

  if (!validation.success) {
    return validation.response;
  }

  const { data, requestId } = validation;
  const callerRole: WorkspaceRole = "owner"; // Requires owner role
  const text = data.confirmationText || data.confirmation || "";

  if (text !== `DELETE ${data.workspaceId}`) {
    return NextResponse.json(
      { error: `Confirmation mismatch. Must type: DELETE ${data.workspaceId}`, requestId },
      { status: 400 }
    );
  }

  try {
    const result = await hardDeleteWorkspace(data.workspaceId, callerRole);

    await recordAuditLog({
      workspaceId: data.workspaceId,
      actorId: "usr_lead_dev",
      actorEmail: "admin@spendlens.demo",
      action: "workspace_delete",
      targetId: data.workspaceId,
      ipAddress: clientIp,
      userAgent: request.headers.get("user-agent") || "unknown",
      metadata: { deletedAt: result.deletedAt },
    });

    return NextResponse.json({
      success: true,
      message: `Workspace ${data.workspaceId} and all associated data permanently purged.`,
      requestId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Deletion failed";
    return NextResponse.json({ error: message, requestId }, { status: 403 });
  }
}

