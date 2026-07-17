import { describe, expect, it } from "vitest";

import {
  isAllowedAdminMagicLinkType,
  isValidAdminMagicLinkTokenHash,
} from "@/lib/admin-magic-link";

describe("administrator TokenHash input validation", () => {
  it("accepts only the official email verification type", () => {
    expect(isAllowedAdminMagicLinkType("email")).toBe(true);
    expect(isAllowedAdminMagicLinkType("magiclink")).toBe(false);
    expect(isAllowedAdminMagicLinkType("recovery")).toBe(false);
    expect(isAllowedAdminMagicLinkType(null)).toBe(false);
  });

  it("rejects missing, short, or malformed token hashes", () => {
    expect(isValidAdminMagicLinkTokenHash("a".repeat(64))).toBe(true);
    expect(isValidAdminMagicLinkTokenHash(null)).toBe(false);
    expect(isValidAdminMagicLinkTokenHash("short")).toBe(false);
    expect(isValidAdminMagicLinkTokenHash("a".repeat(32) + ".invalid")).toBe(
      false,
    );
  });
});
