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
  data: { user: AuthUser | null; session?: unknown | null };
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

export type AdminAuthConfirmDiagnosticStage =
  | "verify_otp"
  | "verified_user"
  | "session_persistence"
  | "allowlist_check"
  | "service_client"
  | "admin_profile_upsert";

export type AdminAuthConfirmReasonCode =
  | "verify_otp_threw"
  | "auth_expired_link"
  | "auth_invalid_link"
  | "auth_verification_failed"
  | "auth_not_allowed"
  | "auth_rate_limited"
  | "auth_configuration_error"
  | "verified_user_missing"
  | "verified_email_missing"
  | "email_not_allowlisted"
  | "service_client_creation_failed"
  | "upsert_permission_denied"
  | "upsert_table_unavailable"
  | "upsert_column_mismatch"
  | "upsert_unique_conflict"
  | "upsert_returned_error"
  | "upsert_threw";

export type AdminAuthConfirmDiagnostic = {
  stage: AdminAuthConfirmDiagnosticStage;
  reasonCode: AdminAuthConfirmReasonCode;
  errorName: string;
  userExists: boolean;
  sessionExists: boolean;
  allowlisted?: boolean;
};

export type AdminMagicLinkConfirmationResult =
  {
    ok: true;
    context: {
      userExists: true;
      sessionExists: boolean;
      allowlisted: true;
    };
  }
  | {
      ok: false;
      error: AdminLoginErrorCode;
      diagnostic: AdminAuthConfirmDiagnostic;
    };

const SAFE_ERROR_NAMES = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "SyntaxError",
  "ZodError",
  "AuthApiError",
  "AuthRetryableFetchError",
  "AuthSessionMissingError",
  "AuthUnknownError",
  "PostgrestError",
]);

export function getSafeAdminAuthErrorName(error: unknown): string {
  if (!error || typeof error !== "object") return "UnknownError";
  const name = (error as { name?: unknown }).name;
  return typeof name === "string" && SAFE_ERROR_NAMES.has(name)
    ? name
    : "UnknownError";
}

export class AdminMagicLinkStageError extends Error {
  readonly stage: "service_client" | "admin_profile_upsert";
  readonly reasonCode: "service_client_creation_failed" | "upsert_threw";
  readonly safeCauseName: string;

  constructor(
    stage: AdminMagicLinkStageError["stage"],
    reasonCode: AdminMagicLinkStageError["reasonCode"],
    cause: unknown,
  ) {
    super("Administrator confirmation dependency failed.");
    this.name = "AdminMagicLinkStageError";
    this.stage = stage;
    this.reasonCode = reasonCode;
    this.safeCauseName = getSafeAdminAuthErrorName(cause);
  }
}

function authErrorReasonCode(
  error: AdminLoginErrorCode,
): AdminAuthConfirmReasonCode {
  switch (error) {
    case "expired_link":
      return "auth_expired_link";
    case "invalid_link":
      return "auth_invalid_link";
    case "verification_failed":
      return "auth_verification_failed";
    case "not_allowed":
      return "auth_not_allowed";
    case "rate_limited":
      return "auth_rate_limited";
    case "configuration_error":
      return "auth_configuration_error";
  }
}

function adminProfileUpsertReasonCode(
  error: unknown,
): AdminAuthConfirmReasonCode {
  const code =
    error && typeof error === "object"
      ? (error as { code?: unknown }).code
      : undefined;

  if (code === "42501") return "upsert_permission_denied";
  if (code === "42P01" || code === "PGRST205") {
    return "upsert_table_unavailable";
  }
  if (code === "42703" || code === "PGRST204") {
    return "upsert_column_mismatch";
  }
  if (code === "23505") return "upsert_unique_conflict";
  return "upsert_returned_error";
}

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
  } catch (error) {
    return {
      ok: false,
      error: "verification_failed",
      diagnostic: {
        stage: "verify_otp",
        reasonCode: "verify_otp_threw",
        errorName: getSafeAdminAuthErrorName(error),
        userExists: false,
        sessionExists: false,
      },
    };
  }

  if (verification.error) {
    const publicError = mapAuthErrorToAdminLoginCode(verification.error);
    return {
      ok: false,
      error: publicError,
      diagnostic: {
        stage: "verify_otp",
        reasonCode: authErrorReasonCode(publicError),
        errorName: getSafeAdminAuthErrorName(verification.error),
        userExists: Boolean(verification.data.user),
        sessionExists: Boolean(verification.data.session),
      },
    };
  }

  const user = verification.data.user;
  const sessionExists = Boolean(verification.data.session);
  if (!user) {
    return {
      ok: false,
      error: "verification_failed",
      diagnostic: {
        stage: "verified_user",
        reasonCode: "verified_user_missing",
        errorName: "UnknownError",
        userExists: false,
        sessionExists,
      },
    };
  }

  if (!isAllowedAdminEmail(user.email, input.adminEmails)) {
    await clearSession(dependencies.signOut);
    return {
      ok: false,
      error: "not_allowed",
      diagnostic: {
        stage: user.email?.trim() ? "allowlist_check" : "verified_user",
        reasonCode: user.email?.trim()
          ? "email_not_allowlisted"
          : "verified_email_missing",
        errorName: "UnknownError",
        userExists: true,
        sessionExists,
        allowlisted: false,
      },
    };
  }

  const email = user.email?.trim().toLowerCase();
  if (!email) {
    await clearSession(dependencies.signOut);
    return {
      ok: false,
      error: "verification_failed",
      diagnostic: {
        stage: "verified_user",
        reasonCode: "verified_email_missing",
        errorName: "UnknownError",
        userExists: true,
        sessionExists,
        allowlisted: false,
      },
    };
  }

  try {
    const { error } = await dependencies.upsertAdminProfile({
      user_id: user.id,
      email,
      display_name: getDisplayName(user),
    });

    if (error) {
      await clearSession(dependencies.signOut);
      return {
        ok: false,
        error: "configuration_error",
        diagnostic: {
          stage: "admin_profile_upsert",
          reasonCode: adminProfileUpsertReasonCode(error),
          errorName: getSafeAdminAuthErrorName(error),
          userExists: true,
          sessionExists,
          allowlisted: true,
        },
      };
    }
  } catch (error) {
    await clearSession(dependencies.signOut);
    const stagedError =
      error instanceof AdminMagicLinkStageError ? error : undefined;
    return {
      ok: false,
      error: "configuration_error",
      diagnostic: {
        stage: stagedError?.stage ?? "admin_profile_upsert",
        reasonCode: stagedError?.reasonCode ?? "upsert_threw",
        errorName:
          stagedError?.safeCauseName ?? getSafeAdminAuthErrorName(error),
        userExists: true,
        sessionExists,
        allowlisted: true,
      },
    };
  }

  return {
    ok: true,
    context: {
      userExists: true,
      sessionExists,
      allowlisted: true,
    },
  };
}
