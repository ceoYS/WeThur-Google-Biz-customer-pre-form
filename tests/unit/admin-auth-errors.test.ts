import { describe, expect, it } from "vitest";

import {
  ADMIN_LOGIN_ERROR_MESSAGES,
  getAdminLoginErrorMessage,
  isAuthRateLimitError,
  mapAuthErrorToAdminLoginCode,
} from "@/lib/admin-auth-errors";

describe("administrator authentication error mapping", () => {
  it.each(["over_email_send_rate_limit", "over_request_rate_limit"])(
    "recognizes the Supabase rate-limit code %s",
    (code) => {
      expect(isAuthRateLimitError({ code })).toBe(true);
      expect(mapAuthErrorToAdminLoginCode({ code })).toBe("rate_limited");
    },
  );

  it.each([
    ["otp_expired", "expired_link"],
    ["validation_failed", "invalid_link"],
    ["pkce_code_verifier_not_found", "invalid_link"],
    ["email_provider_disabled", "configuration_error"],
    ["unexpected_failure", "verification_failed"],
  ] as const)("maps %s to the safe code %s", (code, expected) => {
    expect(mapAuthErrorToAdminLoginCode({ code })).toBe(expected);
  });

  it("shows every supported public error message", () => {
    for (const [code, message] of Object.entries(ADMIN_LOGIN_ERROR_MESSAGES)) {
      expect(getAdminLoginErrorMessage(code)).toBe(message);
    }
  });

  it("hides unknown internal error details", () => {
    expect(getAdminLoginErrorMessage("internal_database_detail")).toBeNull();
  });
});
