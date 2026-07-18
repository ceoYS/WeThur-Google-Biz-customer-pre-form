import { NextResponse, type NextRequest } from "next/server";

import {
  AdminMagicLinkStageError,
  confirmAdminMagicLink,
  getSafeAdminAuthErrorName,
  isAllowedAdminMagicLinkType,
  isValidAdminMagicLinkTokenHash,
  type AdminAuthConfirmDiagnosticStage,
} from "@/lib/admin-magic-link";
import {
  createAdminLoginUrl,
  resolveAdminRedirectUrl,
} from "@/lib/auth-redirect";
import type { AdminLoginErrorCode } from "@/lib/admin-auth-errors";
import { getServerEnvironment } from "@/lib/env.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

type RouteDiagnosticStage =
  | "query_validation"
  | "allowlist_config"
  | "supabase_server_client"
  | AdminAuthConfirmDiagnosticStage
  | "redirect";

function logConfirmFailure(input: {
  stage: RouteDiagnosticStage;
  reasonCode: string;
  errorName?: string;
  userExists?: boolean;
  sessionExists?: boolean;
  allowlisted?: boolean;
}) {
  console.error({
    event: "admin_auth_confirm_failed",
    stage: input.stage,
    reason_code: input.reasonCode,
    error_name: input.errorName ?? "UnknownError",
    user_exists: input.userExists ?? false,
    session_exists: input.sessionExists ?? false,
    ...(input.allowlisted === undefined
      ? {}
      : { user_allowlisted: input.allowlisted }),
  });
}

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

  if (!isValidAdminMagicLinkTokenHash(tokenHash)) {
    logConfirmFailure({
      stage: "query_validation",
      reasonCode: tokenHash ? "invalid_token_hash" : "missing_token_hash",
    });
    return loginRedirect(request, "invalid_link");
  }

  if (!isAllowedAdminMagicLinkType(type)) {
    logConfirmFailure({
      stage: "query_validation",
      reasonCode: "invalid_type",
    });
    return loginRedirect(request, "invalid_link");
  }

  let environment: ReturnType<typeof getServerEnvironment>;
  try {
    environment = getServerEnvironment();
  } catch (error) {
    logConfirmFailure({
      stage: "allowlist_config",
      reasonCode: "server_environment_invalid",
      errorName: getSafeAdminAuthErrorName(error),
    });
    return loginRedirect(request, "configuration_error");
  }

  let nextUrl: URL;
  try {
    nextUrl = resolveAdminRedirectUrl(
      request.nextUrl.searchParams.get("next"),
      environment.APP_URL,
    );
  } catch (error) {
    logConfirmFailure({
      stage: "redirect",
      reasonCode: "redirect_construction_failed",
      errorName: getSafeAdminAuthErrorName(error),
    });
    return loginRedirect(request, "configuration_error");
  }

  let cookieWriteErrorName: string | undefined;
  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  try {
    supabase = await createServerSupabaseClient({
      onCookieWriteError(error) {
        cookieWriteErrorName = getSafeAdminAuthErrorName(error);
      },
    });
  } catch (error) {
    logConfirmFailure({
      stage: "supabase_server_client",
      reasonCode: "server_client_creation_failed",
      errorName: getSafeAdminAuthErrorName(error),
    });
    return loginRedirect(request, "configuration_error", environment.APP_URL);
  }

  let result: Awaited<ReturnType<typeof confirmAdminMagicLink>>;
  try {
    result = await confirmAdminMagicLink(
      {
        tokenHash,
        type,
        adminEmails: environment.ADMIN_EMAILS,
      },
      {
        verifyOtp: (input) => supabase.auth.verifyOtp(input),
        signOut: () => supabase.auth.signOut(),
        upsertAdminProfile: async (profile) => {
          let service: ReturnType<typeof createServiceRoleClient>;
          try {
            service = createServiceRoleClient();
          } catch (error) {
            throw new AdminMagicLinkStageError(
              "service_client",
              "service_client_creation_failed",
              error,
            );
          }

          try {
            const { error } = await service
              .from("admin_profiles")
              .upsert(profile, { onConflict: "user_id" });
            return { error };
          } catch (error) {
            throw new AdminMagicLinkStageError(
              "admin_profile_upsert",
              "upsert_threw",
              error,
            );
          }
        },
      },
    );
  } catch (error) {
    logConfirmFailure({
      stage: "admin_profile_upsert",
      reasonCode: "unexpected_confirmation_failure",
      errorName: getSafeAdminAuthErrorName(error),
    });
    return loginRedirect(request, "configuration_error", environment.APP_URL);
  }

  if (!result.ok) {
    logConfirmFailure(result.diagnostic);
    return loginRedirect(request, result.error, environment.APP_URL);
  }

  if (cookieWriteErrorName) {
    logConfirmFailure({
      stage: "session_persistence",
      reasonCode: "cookie_write_failed",
      errorName: cookieWriteErrorName,
      ...result.context,
    });
    return loginRedirect(request, "configuration_error", environment.APP_URL);
  }

  try {
    return NextResponse.redirect(nextUrl);
  } catch (error) {
    logConfirmFailure({
      stage: "redirect",
      reasonCode: "redirect_response_failed",
      errorName: getSafeAdminAuthErrorName(error),
      ...result.context,
    });
    return loginRedirect(request, "configuration_error", environment.APP_URL);
  }
}
