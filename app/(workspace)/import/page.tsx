import { redirect } from "next/navigation";
import { getSessionUser, getUserWorkspace } from "@/lib/auth/server";
import CSVImportClient from "@/components/workspace/CSVImportClient";

export const dynamic = "force-dynamic";

export default async function CSVImportPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const userWs = await getUserWorkspace(user.id);
  const workspaceId = userWs?.workspaceId || "00000000-0000-0000-0000-000000000001";
  const userRole = userWs?.role || "owner";

  return (
    <CSVImportClient
      workspaceId={workspaceId}
      userRole={userRole}
    />
  );
}
