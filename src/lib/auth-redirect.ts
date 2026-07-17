export function resolveAdminRedirectUrl(
  requestedPath: string | null,
  appUrl: string,
): URL {
  const fallback = new URL("/admin", appUrl);
  if (!requestedPath) return fallback;

  try {
    const candidate = new URL(requestedPath, fallback);
    const isAdminPath =
      candidate.pathname === "/admin" ||
      candidate.pathname.startsWith("/admin/");

    if (candidate.origin !== fallback.origin || !isAdminPath) return fallback;
    return candidate;
  } catch {
    return fallback;
  }
}
