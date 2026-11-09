import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const browserSupabase = createClient(supabaseUrl, supabaseAnonKey);

export async function signInWithMagicLink(email: string, redirectTo?: string) {
  const redirect = redirectTo || `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`;
  const { data, error } = await browserSupabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirect,
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle(redirectTo?: string) {
  const redirect = redirectTo || `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`;
  const { data, error } = await browserSupabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirect,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await browserSupabase.auth.signOut({ scope: "global" });
  if (error) throw error;
}

