import { NextResponse, type NextRequest } from "next/server";

import { isAllowedAdminEmail } from "@/lib/admin-allowlist";
import { resolveAdminRedirectUrl } from "@/lib/auth-redirect";
import { getServerEnvironment } from "@/lib/env.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const environment = getServerEnvironment();
  const nextUrl = resolveAdminRedirectUrl(
    request.nextUrl.searchParams.get("next"),
    environment.APP_URL,
  );
  const loginUrl = new URL("/admin/login", environment.APP_URL);

  if (!code) {
    loginUrl.searchParams.set("error", "invalid_link");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  const user = data.user;

  if (
    error ||
    !user ||
    !isAllowedAdminEmail(user.email, environment.ADMIN_EMAILS)
  ) {
    await supabase.auth.signOut();
    loginUrl.searchParams.set("error", "not_allowed");
    return NextResponse.redirect(loginUrl);
  }

  const email = user.email?.trim().toLowerCase();
  if (!email) {
    await supabase.auth.signOut();
    loginUrl.searchParams.set("error", "invalid_account");
    return NextResponse.redirect(loginUrl);
  }

  const service = createServiceRoleClient();
  const { error: provisionError } = await service.from("admin_profiles").upsert(
    {
      user_id: user.id,
      email,
      display_name: user.user_metadata?.full_name ?? null,
    },
    { onConflict: "user_id" },
  );

  if (provisionError) {
    await supabase.auth.signOut();
    loginUrl.searchParams.set("error", "provision_failed");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(nextUrl);
}
