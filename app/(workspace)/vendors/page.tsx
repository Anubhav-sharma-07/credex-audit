import { redirect } from "next/navigation";
import { getSessionUser, getUserWorkspace, createServerSupabaseClient } from "@/lib/auth/server";
import { getSubscriptionRepository } from "@/modules/workspace/repository";
import VendorsClient from "@/components/workspace/VendorsClient";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const userWs = await getUserWorkspace(user.id);
  const workspaceId = userWs?.workspaceId || "00000000-0000-0000-0000-000000000001";
  const userRole = userWs?.role || "owner";

  const supabase = await createServerSupabaseClient();
  const repo = getSubscriptionRepository(supabase);
  const initialVendors = await repo.getVendorDirectory(workspaceId);

  return (
    <VendorsClient
      initialVendors={initialVendors}
      workspaceId={workspaceId}
      userRole={userRole}
    />
  );
}
