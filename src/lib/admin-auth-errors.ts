export const ADMIN_LOGIN_ERROR_MESSAGES = {
  expired_link: "로그인 링크가 만료되었거나 이미 사용되었습니다.",
  invalid_link: "올바르지 않은 로그인 링크입니다. 새 링크를 요청해주세요.",
  verification_failed:
    "로그인 링크를 확인하지 못했습니다. 새 링크를 요청해주세요.",
  not_allowed: "허용된 관리자 이메일이 아닙니다.",
  rate_limited: "로그인 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  configuration_error:
    "로그인 설정을 확인하는 중 문제가 발생했습니다. 관리자에게 문의해주세요.",
} as const;

export type AdminLoginErrorCode = keyof typeof ADMIN_LOGIN_ERROR_MESSAGES;

const ADMIN_LOGIN_ERROR_CODES = new Set<AdminLoginErrorCode>(
  Object.keys(ADMIN_LOGIN_ERROR_MESSAGES) as AdminLoginErrorCode[],
);

type AuthErrorLike = {
  code?: unknown;
};

function getAuthErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const code = (error as AuthErrorLike).code;
  return typeof code === "string" ? code : null;
}

export function isAuthRateLimitError(error: unknown): boolean {
  const code = getAuthErrorCode(error);
  return (
    code === "over_email_send_rate_limit" || code === "over_request_rate_limit"
  );
}

export function mapAuthErrorToAdminLoginCode(
  error: unknown,
): AdminLoginErrorCode {
  const code = getAuthErrorCode(error);

  if (isAuthRateLimitError(error)) return "rate_limited";
  if (code === "otp_expired" || code === "flow_state_expired") {
    return "expired_link";
  }
  if (
    code === "bad_code_verifier" ||
    code === "bad_jwt" ||
    code === "flow_state_not_found" ||
    code === "invalid_credentials" ||
    code === "otp_disabled" ||
    code === "pkce_code_verifier_not_found" ||
    code === "validation_failed"
  ) {
    return "invalid_link";
  }
  if (code === "email_provider_disabled") return "configuration_error";

  return "verification_failed";
}

export function getAdminLoginErrorMessage(
  value: string | string[] | null | undefined,
): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    !candidate ||
    !ADMIN_LOGIN_ERROR_CODES.has(candidate as AdminLoginErrorCode)
  ) {
    return null;
  }
  return ADMIN_LOGIN_ERROR_MESSAGES[candidate as AdminLoginErrorCode];
}
