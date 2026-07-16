import { randomBytes } from "node:crypto";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCaseCode(length = 10): string {
  if (length < 8 || length > 24)
    throw new Error("Case code length must be 8 to 24.");
  const bytes = randomBytes(length);
  let suffix = "";

  for (const byte of bytes) suffix += alphabet[byte % alphabet.length];
  return `WTH-${suffix}`;
}
