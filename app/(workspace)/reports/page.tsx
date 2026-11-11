import { redirect } from "next/navigation";
import { getSessionUser, getUserWorkspace, createServerSupabaseClient } from "@/lib/auth/server";
import { getSubscriptionRepository } from "@/modules/workspace/repository";
import ReportsClient from "@/components/workspace/ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const userWs = await getUserWorkspace(user.id);
  const workspaceId = userWs?.workspaceId || "00000000-0000-0000-0000-000000000001";
  const workspaceName = userWs?.name || "Engineering Workspace";

  const supabase = await createServerSupabaseClient();
  const repo = getSubscriptionRepository(supabase);
  const res = await repo.list(workspaceId, { pageSize: 200 });

  return (
    <ReportsClient
      initialSubscriptions={res.data}
      workspaceName={workspaceName}
      workspaceId={workspaceId}
    />
  );
}
