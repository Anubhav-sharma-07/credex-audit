import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { WorkspaceMember, WorkspaceRole } from "@/modules/workspace/types";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthSession {
  user: AuthUser;
  membership?: WorkspaceMember;
}

/**
 * Creates a server-side Supabase client using Next.js cookies.
 * Enforces server-side authentication checks on every server action and route handler.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Handled when called from server component
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        } catch {
          // Handled when called from server component
        }
      },
    },
  });
}

/**
 * Server-side session verification.
 * Never trust a client-supplied token or proxy header alone.
 */
export async function getSessionUser(): Promise<AuthUser | null> {
  const isMockAuth = process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (isMockAuth) {
    return {
      id: "usr_mock_lead_dev",
      email: "engineer@spendlens.demo",
      role: "authenticated",
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    return {
      id: user.id,
      email: user.email || "",
      role: user.role || "authenticated",
    };
  } catch {
    return null;
  }
}

/**
 * Enforces dual tenant isolation: verifies authenticated user is an authorized member of workspace.
 */
export async function requireWorkspaceMember(
  workspaceId: string,
  allowedRoles: WorkspaceRole[] = ["owner", "admin", "member"]
): Promise<{ user: AuthUser; role: WorkspaceRole }> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Unauthorized: Sign in required.");
  }

  // Development/mock bypass when Supabase credentials are absent
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { user, role: "owner" };
  }

  const supabase = await createServerSupabaseClient();
  const { data: membership, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (error || !membership) {
    throw new Error("Access denied: You are not a member of this workspace.");
  }

  const role = membership.role as WorkspaceRole;
  if (!allowedRoles.includes(role)) {
    throw new Error(`Forbidden: Role '${role}' lacks permission for this action.`);
  }

  return { user, role };
}

