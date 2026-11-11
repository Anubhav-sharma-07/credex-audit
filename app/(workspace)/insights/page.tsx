import { redirect } from "next/navigation";
import { getSessionUser, getUserWorkspace, requireWorkspaceMember } from "@/lib/auth/server";
import InsightsClient from "@/components/workspace/InsightsClient";

export const dynamic = "force-dynamic";

export default async function AIInsightsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const userWs = await getUserWorkspace(user.id);
  const workspaceId = userWs?.workspaceId || "00000000-0000-0000-0000-000000000001";

  const { role } = await requireWorkspaceMember(workspaceId, [
    "owner",
    "admin",
    "finance",
    "member",
    "viewer",
  ]);

  return (
    <InsightsClient
      workspaceId={workspaceId}
      userRole={role}
    />
  );
}
