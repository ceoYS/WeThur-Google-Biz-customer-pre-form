import { NextResponse, type NextRequest } from "next/server";

import { isAllowedAdminEmail } from "@/lib/admin-allowlist";
import { mapAuthErrorToAdminLoginCode } from "@/lib/admin-auth-errors";
import {
  createAdminLoginUrl,
  resolveAdminRedirectUrl,
} from "@/lib/auth-redirect";
import { getServerEnvironment } from "@/lib/env.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  let environment: ReturnType<typeof getServerEnvironment>;
  try {
    environment = getServerEnvironment();
  } catch {
    return NextResponse.redirect(
      createAdminLoginUrl(request.url, "configuration_error"),
    );
  }

  const nextUrl = resolveAdminRedirectUrl(
    request.nextUrl.searchParams.get("next"),
    environment.APP_URL,
  );
  const loginUrl = createAdminLoginUrl(
    request.url,
    "verification_failed",
    environment.APP_URL,
  );

  if (!code) {
    loginUrl.searchParams.set("error", "invalid_link");
    return NextResponse.redirect(loginUrl);
  }

  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    loginUrl.searchParams.set("error", "configuration_error");
    return NextResponse.redirect(loginUrl);
  }

  const clearSession = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // The redirect still denies access; do not expose sign-out internals.
    }
  };

  let exchange: Awaited<
    ReturnType<typeof supabase.auth.exchangeCodeForSession>
  >;
  try {
    exchange = await supabase.auth.exchangeCodeForSession(code);
  } catch {
    await clearSession();
    loginUrl.searchParams.set("error", "verification_failed");
    return NextResponse.redirect(loginUrl);
  }

  const { data, error } = exchange;
  const user = data.user;

  if (error) {
    await clearSession();
    loginUrl.searchParams.set("error", mapAuthErrorToAdminLoginCode(error));
    return NextResponse.redirect(loginUrl);
  }

  if (!user) {
    await clearSession();
    loginUrl.searchParams.set("error", "verification_failed");
    return NextResponse.redirect(loginUrl);
  }

  if (!isAllowedAdminEmail(user.email, environment.ADMIN_EMAILS)) {
    await clearSession();
    loginUrl.searchParams.set("error", "not_allowed");
    return NextResponse.redirect(loginUrl);
  }

  const email = user.email?.trim().toLowerCase();
  if (!email) {
    await clearSession();
    loginUrl.searchParams.set("error", "verification_failed");
    return NextResponse.redirect(loginUrl);
  }

  let provisionError: unknown;
  try {
    const service = createServiceRoleClient();
    const result = await service.from("admin_profiles").upsert(
      {
        user_id: user.id,
        email,
        display_name: user.user_metadata?.full_name ?? null,
      },
      { onConflict: "user_id" },
    );
    provisionError = result.error;
  } catch {
    provisionError = true;
  }

  if (provisionError) {
    await clearSession();
    loginUrl.searchParams.set("error", "configuration_error");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(nextUrl);
}
