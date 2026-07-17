"use server";

import { z } from "zod";

import { isAllowedAdminEmail } from "@/lib/admin-allowlist";
import {
  ADMIN_LOGIN_ERROR_MESSAGES,
  isAuthRateLimitError,
  mapAuthErrorToAdminLoginCode,
} from "@/lib/admin-auth-errors";
import { getServerEnvironment } from "@/lib/env.server";
import { hasPublicSupabaseEnvironment } from "@/lib/env.public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import type { LoginActionState } from "./action-state";

const emailSchema = z.email().max(254);
const neutralSuccessMessage =
  "허용된 관리자 이메일이라면 로그인 링크가 전송됩니다. 이메일이 오지 않으면 잠시 후 다시 요청해주세요.";

export async function requestMagicLink(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  if (!hasPublicSupabaseEnvironment()) {
    return {
      status: "error",
      message: ADMIN_LOGIN_ERROR_MESSAGES.configuration_error,
    };
  }

  const emailResult = emailSchema.safeParse(formData.get("email"));
  if (!emailResult.success) {
    return { status: "error", message: "올바른 이메일 주소를 입력해주세요." };
  }

  // Keep the response neutral so the allowlist cannot be enumerated.
  let environment: ReturnType<typeof getServerEnvironment>;
  try {
    environment = getServerEnvironment();
  } catch {
    return {
      status: "error",
      message: ADMIN_LOGIN_ERROR_MESSAGES.configuration_error,
    };
  }

  if (!isAllowedAdminEmail(emailResult.data, environment.ADMIN_EMAILS)) {
    return {
      status: "success",
      message: neutralSuccessMessage,
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: emailResult.data.toLowerCase(),
      options: {
        // ConfirmationURL-based emails already in flight can still use the
        // legacy callback. The TokenHash template links to /auth/confirm.
        emailRedirectTo: new URL(
          "/auth/callback?next=/admin",
          environment.APP_URL,
        ).toString(),
        shouldCreateUser: true,
      },
    });

    if (error) {
      const errorCode = isAuthRateLimitError(error)
        ? "rate_limited"
        : mapAuthErrorToAdminLoginCode(error);
      return {
        status: "error",
        message:
          errorCode === "configuration_error"
            ? ADMIN_LOGIN_ERROR_MESSAGES.configuration_error
            : errorCode === "rate_limited"
              ? ADMIN_LOGIN_ERROR_MESSAGES.rate_limited
              : "로그인 링크를 보내지 못했습니다. 잠시 후 다시 시도해주세요.",
      };
    }
  } catch {
    return {
      status: "error",
      message: "로그인 링크를 보내지 못했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  return {
    status: "success",
    message: neutralSuccessMessage,
  };
}
