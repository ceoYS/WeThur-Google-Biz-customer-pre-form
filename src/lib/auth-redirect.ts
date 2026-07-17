import type { AdminLoginErrorCode } from "@/lib/admin-auth-errors";

export function isSafeAdminNextPath(
  requestedPath: string | null,
): requestedPath is string {
  if (
    !requestedPath ||
    !requestedPath.startsWith("/") ||
    requestedPath.startsWith("//") ||
    requestedPath.includes("\\")
  ) {
    return false;
  }

  try {
    const base = new URL("https://admin.invalid/admin");
    const candidate = new URL(requestedPath, base);
    const isAdminPath =
      candidate.pathname === "/admin" ||
      candidate.pathname.startsWith("/admin/");

    return candidate.origin === base.origin && isAdminPath;
  } catch {
    return false;
  }
}

export function createAdminLoginUrl(
  requestUrl: string | URL,
  error: AdminLoginErrorCode,
  appUrl?: string,
): URL {
  const requestOrigin = new URL(requestUrl).origin;
  const loginUrl = new URL("/admin/login", appUrl ?? requestOrigin);
  loginUrl.searchParams.set("error", error);
  return loginUrl;
}

export function resolveAdminRedirectUrl(
  requestedPath: string | null,
  appUrl: string,
): URL {
  const fallback = new URL("/admin", appUrl);
  if (!isSafeAdminNextPath(requestedPath)) return fallback;

  try {
    return new URL(requestedPath, fallback);
  } catch {
    return fallback;
  }
}
