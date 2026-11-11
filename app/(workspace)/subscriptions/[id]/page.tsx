import { notFound, redirect } from "next/navigation";
import { getSessionUser, getUserWorkspace, createServerSupabaseClient } from "@/lib/auth/server";
import { getSubscriptionRepository } from "@/modules/workspace/repository";
import SubscriptionDetailClient from "@/components/workspace/SubscriptionDetailClient";

export const dynamic = "force-dynamic";

export default async function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const userWs = await getUserWorkspace(user.id);
  const workspaceId = userWs?.workspaceId || "00000000-0000-0000-0000-000000000001";
  const userRole = userWs?.role || "owner";

  const supabase = await createServerSupabaseClient();
  const repo = getSubscriptionRepository(supabase);
  const sub = await repo.getById(workspaceId, id);

  if (!sub) {
    notFound();
  }

  return (
    <SubscriptionDetailClient
      initialSubscription={sub}
      workspaceId={workspaceId}
      userRole={userRole}
    />
  );
}
