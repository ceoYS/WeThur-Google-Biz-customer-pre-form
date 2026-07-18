import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AdminMagicLinkStageError,
  confirmAdminMagicLink,
} from "@/lib/admin-magic-link";

const allowedEmail = "allowed-admin@example.test";
const verifiedEmail = "Allowed-Admin@Example.Test";
const tokenHash = "a".repeat(64);

function createDependencies() {
  return {
    verifyOtp: vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "00000000-0000-4000-8000-000000000001",
          email: verifiedEmail,
          user_metadata: { full_name: "Test Administrator" },
        },
        session: { synthetic: true },
      },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    upsertAdminProfile: vi.fn().mockResolvedValue({ error: null }),
  };
}

describe("administrator TokenHash confirmation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("verifies a valid hash and upserts the allowlisted administrator profile", async () => {
    const dependencies = createDependencies();

    const result = await confirmAdminMagicLink(
      { tokenHash, type: "email", adminEmails: allowedEmail },
      dependencies,
    );

    expect(result).toEqual({
      ok: true,
      context: {
        userExists: true,
        sessionExists: true,
        allowlisted: true,
      },
    });
    expect(dependencies.verifyOtp).toHaveBeenCalledWith({
      token_hash: tokenHash,
      type: "email",
    });
    expect(dependencies.upsertAdminProfile).toHaveBeenCalledWith({
      user_id: "00000000-0000-4000-8000-000000000001",
      email: allowedEmail,
      display_name: "Test Administrator",
    });
    expect(dependencies.signOut).not.toHaveBeenCalled();
  });

  it.each([
    ["validation_failed", "invalid_link"],
    ["otp_expired", "expired_link"],
  ] as const)("returns %s failures as %s", async (code, expected) => {
    const dependencies = createDependencies();
    dependencies.verifyOtp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code },
    });

    const result = await confirmAdminMagicLink(
      { tokenHash, type: "email", adminEmails: allowedEmail },
      dependencies,
    );

    expect(result).toMatchObject({
      ok: false,
      error: expected,
      diagnostic: { stage: "verify_otp", userExists: false },
    });
    expect(dependencies.upsertAdminProfile).not.toHaveBeenCalled();
  });

  it("distinguishes a thrown OTP client failure without exposing its message", async () => {
    const dependencies = createDependencies();
    dependencies.verifyOtp.mockRejectedValue(
      new Error("synthetic-token-and-provider-detail"),
    );

    const result = await confirmAdminMagicLink(
      { tokenHash, type: "email", adminEmails: allowedEmail },
      dependencies,
    );

    expect(result).toMatchObject({
      ok: false,
      error: "verification_failed",
      diagnostic: {
        stage: "verify_otp",
        reasonCode: "verify_otp_threw",
        errorName: "Error",
        userExists: false,
        sessionExists: false,
      },
    });
  });

  it("distinguishes a successful OTP response with no user", async () => {
    const dependencies = createDependencies();
    dependencies.verifyOtp.mockResolvedValue({
      data: { user: null, session: { synthetic: true } },
      error: null,
    });

    const result = await confirmAdminMagicLink(
      { tokenHash, type: "email", adminEmails: allowedEmail },
      dependencies,
    );

    expect(result).toMatchObject({
      ok: false,
      error: "verification_failed",
      diagnostic: {
        stage: "verified_user",
        reasonCode: "verified_user_missing",
        userExists: false,
        sessionExists: true,
      },
    });
    expect(dependencies.upsertAdminProfile).not.toHaveBeenCalled();
  });

  it("records that the current workflow does not require a returned session", async () => {
    const dependencies = createDependencies();
    dependencies.verifyOtp.mockResolvedValue({
      data: {
        user: {
          id: "00000000-0000-4000-8000-000000000001",
          email: verifiedEmail,
          user_metadata: null,
        },
        session: null,
      },
      error: null,
    });

    const result = await confirmAdminMagicLink(
      { tokenHash, type: "email", adminEmails: allowedEmail },
      dependencies,
    );

    expect(result).toEqual({
      ok: true,
      context: {
        userExists: true,
        sessionExists: false,
        allowlisted: true,
      },
    });
    expect(dependencies.upsertAdminProfile).toHaveBeenCalledOnce();
  });

  it("distinguishes a verified user with no usable email", async () => {
    const dependencies = createDependencies();
    dependencies.verifyOtp.mockResolvedValue({
      data: {
        user: {
          id: "00000000-0000-4000-8000-000000000001",
          email: null,
          user_metadata: null,
        },
        session: { synthetic: true },
      },
      error: null,
    });

    const result = await confirmAdminMagicLink(
      { tokenHash, type: "email", adminEmails: allowedEmail },
      dependencies,
    );

    expect(result).toMatchObject({
      ok: false,
      error: "not_allowed",
      diagnostic: {
        stage: "verified_user",
        reasonCode: "verified_email_missing",
        allowlisted: false,
      },
    });
    expect(dependencies.signOut).toHaveBeenCalledOnce();
    expect(dependencies.upsertAdminProfile).not.toHaveBeenCalled();
  });

  it("clears the session and blocks an email outside ADMIN_EMAILS", async () => {
    const dependencies = createDependencies();

    const result = await confirmAdminMagicLink(
      {
        tokenHash,
        type: "email",
        adminEmails: "different-admin@example.test",
      },
      dependencies,
    );

    expect(result).toMatchObject({
      ok: false,
      error: "not_allowed",
      diagnostic: {
        stage: "allowlist_check",
        reasonCode: "email_not_allowlisted",
        allowlisted: false,
      },
    });
    expect(dependencies.signOut).toHaveBeenCalledOnce();
    expect(dependencies.upsertAdminProfile).not.toHaveBeenCalled();
  });

  it("clears the session when admin_profiles cannot be upserted", async () => {
    const dependencies = createDependencies();
    dependencies.upsertAdminProfile.mockResolvedValue({
      error: { code: "database_failure" },
    });

    const result = await confirmAdminMagicLink(
      { tokenHash, type: "email", adminEmails: allowedEmail },
      dependencies,
    );

    expect(result).toMatchObject({
      ok: false,
      error: "configuration_error",
      diagnostic: {
        stage: "admin_profile_upsert",
        reasonCode: "upsert_returned_error",
        userExists: true,
        sessionExists: true,
        allowlisted: true,
      },
    });
    expect(dependencies.signOut).toHaveBeenCalledOnce();
  });

  it.each([
    ["42501", "upsert_permission_denied"],
    ["PGRST205", "upsert_table_unavailable"],
    ["PGRST204", "upsert_column_mismatch"],
    ["23505", "upsert_unique_conflict"],
  ] as const)(
    "classifies the safe admin_profiles error code %s as %s",
    async (code, reasonCode) => {
      const dependencies = createDependencies();
      dependencies.upsertAdminProfile.mockResolvedValue({ error: { code } });

      const result = await confirmAdminMagicLink(
        { tokenHash, type: "email", adminEmails: allowedEmail },
        dependencies,
      );

      expect(result).toMatchObject({
        ok: false,
        error: "configuration_error",
        diagnostic: {
          stage: "admin_profile_upsert",
          reasonCode,
        },
      });
    },
  );

  it("distinguishes an admin_profiles upsert throw", async () => {
    const dependencies = createDependencies();
    dependencies.upsertAdminProfile.mockRejectedValue(
      new TypeError("synthetic-database-detail"),
    );

    const result = await confirmAdminMagicLink(
      { tokenHash, type: "email", adminEmails: allowedEmail },
      dependencies,
    );

    expect(result).toMatchObject({
      ok: false,
      error: "configuration_error",
      diagnostic: {
        stage: "admin_profile_upsert",
        reasonCode: "upsert_threw",
        errorName: "TypeError",
      },
    });
    expect(dependencies.signOut).toHaveBeenCalledOnce();
  });

  it("preserves a service-client construction stage", async () => {
    const dependencies = createDependencies();
    dependencies.upsertAdminProfile.mockRejectedValue(
      new AdminMagicLinkStageError(
        "service_client",
        "service_client_creation_failed",
        new Error("synthetic-service-secret-detail"),
      ),
    );

    const result = await confirmAdminMagicLink(
      { tokenHash, type: "email", adminEmails: allowedEmail },
      dependencies,
    );

    expect(result).toMatchObject({
      ok: false,
      error: "configuration_error",
      diagnostic: {
        stage: "service_client",
        reasonCode: "service_client_creation_failed",
        errorName: "Error",
      },
    });
  });

  it("does not write the token hash or administrator email to logs", async () => {
    const logSpies = [
      vi.spyOn(console, "log").mockImplementation(() => undefined),
      vi.spyOn(console, "warn").mockImplementation(() => undefined),
      vi.spyOn(console, "error").mockImplementation(() => undefined),
    ];
    const dependencies = createDependencies();

    await confirmAdminMagicLink(
      { tokenHash, type: "email", adminEmails: allowedEmail },
      dependencies,
    );

    for (const spy of logSpies) expect(spy).not.toHaveBeenCalled();
  });
});
