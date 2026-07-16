import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { z } from "zod";

export const INTAKE_TOKEN_BYTES = 32;
export const intakeTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "유효하지 않은 고객 링크입니다.");

export function generateIntakeToken(): string {
  return randomBytes(INTAKE_TOKEN_BYTES).toString("base64url");
}

export function hashIntakeToken(token: string, secret: string): string {
  const validToken = intakeTokenSchema.parse(token);
  if (secret.length < 32) {
    throw new Error("Token hash secret must contain at least 32 characters.");
  }

  return createHmac("sha256", secret).update(validToken).digest("hex");
}

export function verifyIntakeTokenHash(
  token: string,
  expectedHash: string,
  secret: string,
): boolean {
  if (
    !intakeTokenSchema.safeParse(token).success ||
    !/^[a-f0-9]{64}$/.test(expectedHash)
  ) {
    return false;
  }

  const actual = Buffer.from(hashIntakeToken(token, secret), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function buildIntakeUrl(appUrl: string, token: string): string {
  const validToken = intakeTokenSchema.parse(token);
  return new URL(`/intake/${validToken}`, appUrl).toString();
}

export function redactIntakeToken(value: string): string {
  return value.replace(/\/intake\/[A-Za-z0-9_-]{43}/g, "/intake/[REDACTED]");
}
