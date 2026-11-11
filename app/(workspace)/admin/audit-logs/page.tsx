import { redirect } from "next/navigation";
import { getSessionUser, getUserWorkspace, requireWorkspaceMember, createServerSupabaseClient } from "@/lib/auth/server";
import { getAuditLogRepository } from "@/modules/security/repository";
import AdminAuditLogsClient from "@/components/workspace/AdminAuditLogsClient";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const userWs = await getUserWorkspace(user.id);
  const workspaceId = userWs?.workspaceId || "00000000-0000-0000-0000-000000000001";

  // Enforce admin or owner role
  const { role } = await requireWorkspaceMember(workspaceId, ["owner", "admin"]);

  const supabase = await createServerSupabaseClient();
  const repo = getAuditLogRepository(supabase);
  const initialLogs = await repo.list(workspaceId, role, { limit: 100 });

  return (
    <AdminAuditLogsClient
      initialLogs={initialLogs}
      workspaceId={workspaceId}
    />
  );
}
