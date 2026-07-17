import { isAllowedAdminEmail } from "@/lib/admin-allowlist";
import {
  mapAuthErrorToAdminLoginCode,
  type AdminLoginErrorCode,
} from "@/lib/admin-auth-errors";

export const ADMIN_MAGIC_LINK_TYPE = "email" as const;

export type AdminMagicLinkType = typeof ADMIN_MAGIC_LINK_TYPE;

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type VerifyOtpResult = {
  data: { user: AuthUser | null };
  error: unknown;
};

type AdminProfile = {
  user_id: string;
  email: string;
  display_name: string | null;
};

type AdminMagicLinkDependencies = {
  verifyOtp: (input: {
    token_hash: string;
    type: AdminMagicLinkType;
  }) => Promise<VerifyOtpResult>;
  signOut: () => Promise<unknown>;
  upsertAdminProfile: (profile: AdminProfile) => Promise<{ error: unknown }>;
};

export type AdminMagicLinkConfirmationResult =
  { ok: true } | { ok: false; error: AdminLoginErrorCode };

export function isAllowedAdminMagicLinkType(
  value: string | null,
): value is AdminMagicLinkType {
  return value === ADMIN_MAGIC_LINK_TYPE;
}

export function isValidAdminMagicLinkTokenHash(
  value: string | null,
): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]{16,512}$/.test(value));
}

function getDisplayName(user: AuthUser): string | null {
  const value = user.user_metadata?.full_name;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function clearSession(signOut: () => Promise<unknown>): Promise<void> {
  try {
    await signOut();
  } catch {
    // The access decision is already denied; do not expose sign-out internals.
  }
}

export async function confirmAdminMagicLink(
  input: {
    tokenHash: string;
    type: AdminMagicLinkType;
    adminEmails: string;
  },
  dependencies: AdminMagicLinkDependencies,
): Promise<AdminMagicLinkConfirmationResult> {
  let verification: VerifyOtpResult;

  try {
    verification = await dependencies.verifyOtp({
      token_hash: input.tokenHash,
      type: input.type,
    });
  } catch {
    return { ok: false, error: "verification_failed" };
  }

  if (verification.error) {
    return {
      ok: false,
      error: mapAuthErrorToAdminLoginCode(verification.error),
    };
  }

  const user = verification.data.user;
  if (!user) return { ok: false, error: "verification_failed" };

  if (!isAllowedAdminEmail(user.email, input.adminEmails)) {
    await clearSession(dependencies.signOut);
    return { ok: false, error: "not_allowed" };
  }

  const email = user.email?.trim().toLowerCase();
  if (!email) {
    await clearSession(dependencies.signOut);
    return { ok: false, error: "verification_failed" };
  }

  try {
    const { error } = await dependencies.upsertAdminProfile({
      user_id: user.id,
      email,
      display_name: getDisplayName(user),
    });

    if (error) {
      await clearSession(dependencies.signOut);
      return { ok: false, error: "configuration_error" };
    }
  } catch {
    await clearSession(dependencies.signOut);
    return { ok: false, error: "configuration_error" };
  }

  return { ok: true };
}
