import { describe, expect, it } from "vitest";

import {
  buildIntakeUrl,
  generateIntakeToken,
  hashIntakeToken,
  intakeTokenSchema,
  redactIntakeToken,
  verifyIntakeTokenHash,
} from "@/lib/tokens";

const secret = "test-secret-that-is-longer-than-thirty-two-characters";

describe("intake tokens", () => {
  it("creates URL-safe tokens with at least 256 bits of entropy", () => {
    const tokens = new Set(Array.from({ length: 100 }, generateIntakeToken));
    expect(tokens.size).toBe(100);
    for (const token of tokens)
      expect(intakeTokenSchema.safeParse(token).success).toBe(true);
  });

  it("creates deterministic secret-keyed hashes without storing the token", () => {
    const token = generateIntakeToken();
    const hash = hashIntakeToken(token, secret);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
    expect(verifyIntakeTokenHash(token, hash, secret)).toBe(true);
    expect(verifyIntakeTokenHash(generateIntakeToken(), hash, secret)).toBe(
      false,
    );
  });

  it("rejects malformed tokens and weak secrets", () => {
    expect(() => hashIntakeToken("sequential-case-1", secret)).toThrow();
    expect(() => hashIntakeToken(generateIntakeToken(), "too-short")).toThrow();
  });

  it("builds and redacts public intake URLs", () => {
    const token = generateIntakeToken();
    const url = buildIntakeUrl("https://example.com", token);
    expect(url).toBe(`https://example.com/intake/${token}`);
    expect(redactIntakeToken(`request ${url}`)).toBe(
      "request https://example.com/intake/[REDACTED]",
    );
  });
});
