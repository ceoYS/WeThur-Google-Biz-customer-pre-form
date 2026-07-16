export function getAllowedAdminEmails(adminEmails: string): Set<string> {
  return new Set(
    adminEmails
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAllowedAdminEmail(
  email: string | null | undefined,
  adminEmails: string,
): boolean {
  if (!email) return false;
  return getAllowedAdminEmails(adminEmails).has(email.trim().toLowerCase());
}
