import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerEnvironment: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
  from: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env.server", () => ({
  getServerEnvironment: mocks.getServerEnvironment,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

import { GET } from "@/app/auth/confirm/route";

const appUrl = "https://app.example.test";
const allowedEmail = "admin@example.test";
const tokenHash = "a".repeat(64);
const verifiedUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: allowedEmail,
  user_metadata: { full_name: "Synthetic Administrator" },
};

let cookieWriteFailure: ((error: unknown) => void) | undefined;
let errorSpy: ReturnType<typeof vi.spyOn>;

function request(query = "") {
  return new NextRequest(`${appUrl}/auth/confirm${query}`);
}

function validRequest(extra = "") {
  return request(`?token_hash=${tokenHash}&type=email${extra}`);
}

function redirectUrl(response: Response): URL {
  const location = response.headers.get("location");
  expect(location).toBeTruthy();
  return new URL(location!);
}

function expectSafeLoginError(response: Response, code: string) {
  const location = redirectUrl(response);
  expect(location.origin).toBe(appUrl);
  expect(location.pathname).toBe("/admin/login");
  expect([...location.searchParams.keys()]).toEqual(["error"]);
  expect(location.searchParams.get("error")).toBe(code);
}

function diagnosticEvents() {
  return errorSpy.mock.calls
    .flat()
    .filter(
      (value: unknown): value is Record<string, unknown> =>
        Boolean(
          value &&
            typeof value === "object" &&
            (value as { event?: unknown }).event ===
              "admin_auth_confirm_failed",
        ),
    );
}

describe("TokenHash confirmation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieWriteFailure = undefined;
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    mocks.getServerEnvironment.mockReturnValue({
      APP_URL: appUrl,
      ADMIN_EMAILS: allowedEmail,
    });
    mocks.verifyOtp.mockResolvedValue({
      data: { user: verifiedUser, session: { synthetic: true } },
      error: null,
    });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ upsert: mocks.upsert });
    mocks.createServiceRoleClient.mockReturnValue({ from: mocks.from });
    mocks.createServerSupabaseClient.mockImplementation(async (options) => {
      cookieWriteFailure = options?.onCookieWriteError;
      return {
        auth: {
          verifyOtp: mocks.verifyOtp,
          signOut: mocks.signOut,
        },
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects a missing token hash before creating a Supabase client", async () => {
    const response = await GET(request("?type=email"));

    expectSafeLoginError(response, "invalid_link");
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
    expect(diagnosticEvents()).toContainEqual(
      expect.objectContaining({
        stage: "query_validation",
        reason_code: "missing_token_hash",
        user_exists: false,
        session_exists: false,
      }),
    );
  });

  it("rejects an invalid type before OTP verification", async () => {
    const response = await GET(
      request(`?token_hash=${tokenHash}&type=recovery`),
    );

    expectSafeLoginError(response, "invalid_link");
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    expect(diagnosticEvents()).toContainEqual(
      expect.objectContaining({
        stage: "query_validation",
        reason_code: "invalid_type",
      }),
    );
  });

  it("maps an expired OTP response to expired_link", async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "otp_expired", name: "AuthApiError" },
    });

    const response = await GET(validRequest());

    expectSafeLoginError(response, "expired_link");
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
    expect(diagnosticEvents()).toContainEqual(
      expect.objectContaining({
        stage: "verify_otp",
        reason_code: "auth_expired_link",
        error_name: "AuthApiError",
      }),
    );
  });

  it("redirects an allowlisted verified user safely to /admin", async () => {
    const response = await GET(validRequest());

    expect(redirectUrl(response).href).toBe(`${appUrl}/admin`);
    expect(mocks.verifyOtp).toHaveBeenCalledOnce();
    expect(mocks.upsert).toHaveBeenCalledWith(
      {
        user_id: verifiedUser.id,
        email: allowedEmail,
        display_name: "Synthetic Administrator",
      },
      { onConflict: "user_id" },
    );
    expect(diagnosticEvents()).toEqual([]);
  });

  it("maps a successful OTP response with no user to verification_failed", async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: null, session: { synthetic: true } },
      error: null,
    });

    const response = await GET(validRequest());

    expectSafeLoginError(response, "verification_failed");
    expect(diagnosticEvents()).toContainEqual(
      expect.objectContaining({
        stage: "verified_user",
        reason_code: "verified_user_missing",
        user_exists: false,
        session_exists: true,
      }),
    );
  });

  it("documents that a returned session is not currently required", async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: verifiedUser, session: null },
      error: null,
    });

    const response = await GET(validRequest());

    expect(redirectUrl(response).href).toBe(`${appUrl}/admin`);
    expect(mocks.upsert).toHaveBeenCalledOnce();
  });

  it("rejects a verified user without a usable email", async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { ...verifiedUser, email: null }, session: {} },
      error: null,
    });

    const response = await GET(validRequest());

    expectSafeLoginError(response, "not_allowed");
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(diagnosticEvents()).toContainEqual(
      expect.objectContaining({
        stage: "verified_user",
        reason_code: "verified_email_missing",
        user_allowlisted: false,
      }),
    );
  });

  it("rejects a verified email outside ADMIN_EMAILS", async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: {
        user: { ...verifiedUser, email: "other@example.test" },
        session: {},
      },
      error: null,
    });

    const response = await GET(validRequest());

    expectSafeLoginError(response, "not_allowed");
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(diagnosticEvents()).toContainEqual(
      expect.objectContaining({
        stage: "allowlist_check",
        reason_code: "email_not_allowlisted",
        user_allowlisted: false,
      }),
    );
  });

  it("maps missing or invalid server configuration before OTP verification", async () => {
    mocks.getServerEnvironment.mockImplementation(() => {
      throw new Error("synthetic-environment-detail");
    });

    const response = await GET(validRequest());

    expectSafeLoginError(response, "configuration_error");
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    expect(diagnosticEvents()).toContainEqual(
      expect.objectContaining({
        stage: "allowlist_config",
        reason_code: "server_environment_invalid",
      }),
    );
  });

  it("documents that a syntactically invalid ADMIN_EMAILS value is not rejected as configuration", async () => {
    mocks.getServerEnvironment.mockReturnValue({
      APP_URL: appUrl,
      ADMIN_EMAILS: "not-an-email",
    });

    const response = await GET(validRequest());

    expectSafeLoginError(response, "not_allowed");
    expect(diagnosticEvents()).toContainEqual(
      expect.objectContaining({
        stage: "allowlist_check",
        reason_code: "email_not_allowlisted",
      }),
    );
  });

  it("distinguishes server-client construction failure", async () => {
    mocks.createServerSupabaseClient.mockRejectedValue(
      new Error("synthetic-public-client-detail"),
    );

    const response = await GET(validRequest());

    expectSafeLoginError(response, "configuration_error");
    expect(diagnosticEvents()).toContainEqual(
      expect.objectContaining({
        stage: "supabase_server_client",
        reason_code: "server_client_creation_failed",
      }),
    );
  });

  it("distinguishes service-role client construction after OTP success", async () => {
    mocks.createServiceRoleClient.mockImplementation(() => {
      throw new Error("synthetic-service-client-detail");
    });

    const response = await GET(validRequest());

    expectSafeLoginError(response, "configuration_error");
    expect(mocks.verifyOtp).toHaveBeenCalledOnce();
    expect(diagnosticEvents()).toContainEqual(
      expect.objectContaining({
        stage: "service_client",
        reason_code: "service_client_creation_failed",
        user_exists: true,
        session_exists: true,
        user_allowlisted: true,
      }),
    );
  });

  it("maps an admin_profiles upsert error after OTP success", async () => {
    mocks.upsert.mockResolvedValue({
      error: {
        code: "42501",
        message: "synthetic-provider-database-detail",
      },
    });

    const response = await GET(validRequest());

    expectSafeLoginError(response, "configuration_error");
    expect(mocks.verifyOtp).toHaveBeenCalledOnce();
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(diagnosticEvents()).toContainEqual(
      expect.objectContaining({
        stage: "admin_profile_upsert",
        reason_code: "upsert_permission_denied",
        error_name: "UnknownError",
      }),
    );
  });

  it("maps an admin_profiles upsert throw after OTP success", async () => {
    mocks.upsert.mockRejectedValue(new TypeError("synthetic-upsert-detail"));

    const response = await GET(validRequest());

    expectSafeLoginError(response, "configuration_error");
    expect(diagnosticEvents()).toContainEqual(
      expect.objectContaining({
        stage: "admin_profile_upsert",
        reason_code: "upsert_threw",
        error_name: "TypeError",
      }),
    );
  });

  it("maps a cookie persistence failure to a safe configuration error", async () => {
    mocks.verifyOtp.mockImplementation(async () => {
      cookieWriteFailure?.(new Error("synthetic-cookie-detail"));
      return {
        data: { user: verifiedUser, session: { synthetic: true } },
        error: null,
      };
    });

    const response = await GET(validRequest());

    expectSafeLoginError(response, "configuration_error");
    expect(diagnosticEvents()).toContainEqual(
      expect.objectContaining({
        stage: "session_persistence",
        reason_code: "cookie_write_failed",
        user_exists: true,
        session_exists: true,
        user_allowlisted: true,
      }),
    );
  });

  it("rejects an unsafe external next value and uses /admin", async () => {
    const response = await GET(validRequest("&next=//attacker.example"));

    expect(redirectUrl(response).href).toBe(`${appUrl}/admin`);
    expect(diagnosticEvents()).toEqual([]);
  });

  it.each([
    ["server client", () => mocks.createServerSupabaseClient.mockRejectedValue(new Error())],
    ["service client", () => mocks.createServiceRoleClient.mockImplementation(() => { throw new Error(); })],
    ["upsert", () => mocks.upsert.mockResolvedValue({ error: { code: "42501" } })],
  ])("keeps the %s failure browser error finite and safe", async (_name, arrange) => {
    arrange();

    const response = await GET(validRequest());
    const location = redirectUrl(response);

    expect(location.searchParams.get("error")).toBe("configuration_error");
    expect([...location.searchParams.keys()]).toEqual(["error"]);
  });

  it("never logs the token, email, secret-like detail, or provider message", async () => {
    mocks.upsert.mockResolvedValue({
      error: {
        code: "42501",
        message: "synthetic-provider-secret-detail",
      },
    });

    await GET(validRequest());

    const serializedDiagnostics = JSON.stringify(errorSpy.mock.calls);
    expect(serializedDiagnostics).not.toContain(tokenHash);
    expect(serializedDiagnostics).not.toContain(allowedEmail);
    expect(serializedDiagnostics).not.toContain(
      "synthetic-provider-secret-detail",
    );
    expect(serializedDiagnostics).toContain("admin_auth_confirm_failed");
  });
});
