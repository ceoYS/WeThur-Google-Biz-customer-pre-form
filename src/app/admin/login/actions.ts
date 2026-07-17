"use server";

import { z } from "zod";

import { isAllowedAdminEmail } from "@/lib/admin-allowlist";
import { getServerEnvironment } from "@/lib/env.server";
import { hasPublicSupabaseEnvironment } from "@/lib/env.public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import type { LoginActionState } from "./action-state";

const emailSchema = z.email().max(254);

export async function requestMagicLink(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  if (!hasPublicSupabaseEnvironment()) {
    return { status: "error", message: "Supabase 환경 설정이 필요합니다." };
  }

  const emailResult = emailSchema.safeParse(formData.get("email"));
  if (!emailResult.success) {
    return { status: "error", message: "올바른 이메일 주소를 입력해주세요." };
  }

  // Keep the response neutral so the allowlist cannot be enumerated.
  const environment = getServerEnvironment();
  if (!isAllowedAdminEmail(emailResult.data, environment.ADMIN_EMAILS)) {
    return {
      status: "success",
      message: "허용된 관리자 이메일이라면 로그인 링크가 전송됩니다.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: emailResult.data.toLowerCase(),
    options: {
      emailRedirectTo: new URL(
        "/auth/callback?next=/admin",
        environment.APP_URL,
      ).toString(),
      shouldCreateUser: true,
    },
  });

  if (error) {
    return {
      status: "error",
      message: "로그인 링크를 보내지 못했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  return {
    status: "success",
    message: "이메일에서 WeThru 관리자 로그인 링크를 확인해주세요.",
  };
}
