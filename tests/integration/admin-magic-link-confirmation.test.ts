import { beforeEach, describe, expect, it, vi } from "vitest";

import { confirmAdminMagicLink } from "@/lib/admin-magic-link";

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

    expect(result).toEqual({ ok: true });
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
      data: { user: null },
      error: { code },
    });

    await expect(
      confirmAdminMagicLink(
        { tokenHash, type: "email", adminEmails: allowedEmail },
        dependencies,
      ),
    ).resolves.toEqual({ ok: false, error: expected });
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

    expect(result).toEqual({ ok: false, error: "not_allowed" });
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

    expect(result).toEqual({ ok: false, error: "configuration_error" });
    expect(dependencies.signOut).toHaveBeenCalledOnce();
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
