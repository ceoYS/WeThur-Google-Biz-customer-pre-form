import { NextResponse, type NextRequest } from "next/server";

import {
  confirmAdminMagicLink,
  isAllowedAdminMagicLinkType,
  isValidAdminMagicLinkTokenHash,
} from "@/lib/admin-magic-link";
import {
  createAdminLoginUrl,
  resolveAdminRedirectUrl,
} from "@/lib/auth-redirect";
import type { AdminLoginErrorCode } from "@/lib/admin-auth-errors";
import { getServerEnvironment } from "@/lib/env.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

function loginRedirect(
  request: NextRequest,
  error: AdminLoginErrorCode,
  appUrl?: string,
): NextResponse {
  return NextResponse.redirect(createAdminLoginUrl(request.url, error, appUrl));
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (
    !isValidAdminMagicLinkTokenHash(tokenHash) ||
    !isAllowedAdminMagicLinkType(type)
  ) {
    return loginRedirect(request, "invalid_link");
  }

  let environment: ReturnType<typeof getServerEnvironment>;
  try {
    environment = getServerEnvironment();
  } catch {
    return loginRedirect(request, "configuration_error");
  }

  const nextUrl = resolveAdminRedirectUrl(
    request.nextUrl.searchParams.get("next"),
    environment.APP_URL,
  );

  try {
    const supabase = await createServerSupabaseClient();
    const result = await confirmAdminMagicLink(
      {
        tokenHash,
        type,
        adminEmails: environment.ADMIN_EMAILS,
      },
      {
        verifyOtp: (input) => supabase.auth.verifyOtp(input),
        signOut: () => supabase.auth.signOut(),
        upsertAdminProfile: async (profile) => {
          const service = createServiceRoleClient();
          const { error } = await service
            .from("admin_profiles")
            .upsert(profile, { onConflict: "user_id" });
          return { error };
        },
      },
    );

    if (!result.ok) {
      return loginRedirect(request, result.error, environment.APP_URL);
    }

    return NextResponse.redirect(nextUrl);
  } catch {
    return loginRedirect(request, "configuration_error", environment.APP_URL);
  }
}
