import { NextRequest, NextResponse } from "next/server";
import { exportWorkspaceData } from "@/modules/security/retention";
import { recordAuditLog } from "@/modules/security/audit_log";
import { getClientIp } from "@/modules/security/rate_limiter";
import { getSessionUser, requireWorkspaceMember, getUserWorkspace } from "@/lib/auth/server";
import { assertMutationCsrfAndOrigin } from "@/modules/security/csrf";
import { captureException } from "@/lib/sentry";

export async function GET(request: NextRequest) {
  let workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) {
    const user = await getSessionUser();
    if (user) {
      const userWs = await getUserWorkspace(user.id);
      workspaceId = userWs?.workspaceId || "00000000-0000-0000-0000-000000000001";
    } else {
      workspaceId = "00000000-0000-0000-0000-000000000001";
    }
  }
  return handleExport(request, workspaceId);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Active session required to export workspace data." },
      { status: 401 }
    );
  }

  const csrfCheck = assertMutationCsrfAndOrigin(request, user);
  if (!csrfCheck.allowed) {
    return csrfCheck.errorResponse!;
  }

  let workspaceId = "00000000-0000-0000-0000-000000000001";
  try {
    const body = await request.json();
    if (body && typeof body.workspaceId === "string") {
      workspaceId = body.workspaceId;
    }
  } catch {
    workspaceId = request.nextUrl.searchParams.get("workspaceId") || "00000000-0000-0000-0000-000000000001";
  }
  return handleExport(request, workspaceId, user);
}

async function handleExport(request: NextRequest, workspaceId: string, preloadedUser?: Awaited<ReturnType<typeof getSessionUser>>) {
  const user = preloadedUser || (await getSessionUser());
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Active session required to export workspace data." },
      { status: 401 }
    );
  }

  const clientIp = getClientIp(request);
  const requestId = `req_exp_${Date.now()}`;

  try {
    const { role: callerRole } = await requireWorkspaceMember(workspaceId, ["owner", "admin", "finance"]);
    const exportedData = await exportWorkspaceData(workspaceId, callerRole);

    await recordAuditLog({
      workspaceId,
      actorId: user.id,
      actorEmail: user.email,
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
        status: 200,
        headers: {
          "Content-Disposition": `attachment; filename="spendlens-export-${workspaceId}-${Date.now()}.json"`,
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to export data";
    captureException(error, {
      route: "api/workspace/export",
      workspaceId,
      userId: user?.id,
      extra: { requestId },
    });
    console.error(`[EXPORT_ERROR] [${requestId}]:`, message);
    return NextResponse.json(
      { error: message, requestId },
      { status: message.includes("Access denied") || message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
