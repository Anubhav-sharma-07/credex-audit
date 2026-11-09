import { NextRequest, NextResponse } from "next/server";
import { exportWorkspaceData } from "@/modules/security/retention";
import { recordAuditLog } from "@/modules/security/audit_log";
import { getClientIp } from "@/modules/security/rate_limiter";
import type { WorkspaceRole } from "@/modules/workspace/types";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId") || "ws_default";
  return handleExport(request, workspaceId);
}

export async function POST(request: NextRequest) {
  let workspaceId = "ws_default";
  try {
    const body = await request.json();
    if (body && typeof body.workspaceId === "string") {
      workspaceId = body.workspaceId;
    }
  } catch {
    // Default to searchParams or ws_default
    workspaceId = request.nextUrl.searchParams.get("workspaceId") || "ws_default";
  }
  return handleExport(request, workspaceId);
}

async function handleExport(request: NextRequest, workspaceId: string) {
  // In demo / test environment, simulate authenticated owner role
  const callerRole: WorkspaceRole = "owner";
  const clientIp = getClientIp(request);
  const requestId = `req_exp_${Date.now()}`;

  try {
    const exportedData = await exportWorkspaceData(workspaceId, callerRole);

    await recordAuditLog({
      workspaceId,
      actorId: "usr_lead_dev",
      actorEmail: "admin@spendlens.demo",
      action: "data_export",
      targetId: workspaceId,
      ipAddress: clientIp,
      userAgent: request.headers.get("user-agent") || "unknown",
      metadata: { subscriptionCount: exportedData.subscriptions.length },
    });

    return NextResponse.json(
      {
        ...exportedData,
        requestId,
      },
      {
        headers: {
          "Content-Disposition": `attachment; filename="spendlens-export-${workspaceId}-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Export failed";
    return NextResponse.json({ error: message, requestId }, { status: 403 });
  }
}

