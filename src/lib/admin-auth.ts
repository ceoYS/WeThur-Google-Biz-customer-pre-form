import "server-only";

import { redirect } from "next/navigation";

import { isAllowedAdminEmail } from "@/lib/admin-allowlist";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CurrentAdmin = {
  id: string;
  email: string;
  displayName: string | null;
};

export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedAdminEmail(user.email, process.env.ADMIN_EMAILS ?? ""))
    return null;

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle<{ display_name: string | null }>();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    displayName: profile.display_name,
  };
}

export async function requireAdmin(): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
