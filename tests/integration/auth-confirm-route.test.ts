import { describe, expect, it, vi } from "vitest";

import {
  isAllowedAdminMagicLinkType,
  isValidAdminMagicLinkTokenHash,
} from "@/lib/admin-magic-link";
import { createAdminLoginUrl } from "@/lib/auth-redirect";

describe("TokenHash confirmation route", () => {
  it.each([
    "https://app.example.test/auth/confirm",
    "https://app.example.test/auth/confirm?token_hash=short&type=email",
    `https://app.example.test/auth/confirm?token_hash=${"a".repeat(64)}&type=recovery&next=//attacker.example`,
  ])(
    "redirects an invalid request using only a safe error code",
    async (url) => {
      const logSpies = [
        vi.spyOn(console, "log").mockImplementation(() => undefined),
        vi.spyOn(console, "warn").mockImplementation(() => undefined),
        vi.spyOn(console, "error").mockImplementation(() => undefined),
      ];

      const requestUrl = new URL(url);
      const tokenHash = requestUrl.searchParams.get("token_hash");
      const type = requestUrl.searchParams.get("type");
      expect(
        isValidAdminMagicLinkTokenHash(tokenHash) &&
          isAllowedAdminMagicLinkType(type),
      ).toBe(false);

      const redirect = createAdminLoginUrl(requestUrl, "invalid_link");

      expect(redirect.origin).toBe("https://app.example.test");
      expect(redirect.pathname).toBe("/admin/login");
      expect([...redirect.searchParams.keys()]).toEqual(["error"]);
      expect(redirect.searchParams.get("error")).toBe("invalid_link");
      for (const spy of logSpies) expect(spy).not.toHaveBeenCalled();

      vi.restoreAllMocks();
    },
  );
});
