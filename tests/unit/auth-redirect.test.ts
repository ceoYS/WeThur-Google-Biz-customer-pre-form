import { describe, expect, it } from "vitest";

import {
  isSafeAdminNextPath,
  resolveAdminRedirectUrl,
} from "@/lib/auth-redirect";

describe("administrator authentication redirects", () => {
  const appUrl = "https://admin.wethru.example";

  it("keeps valid administrator destinations on the configured origin", () => {
    expect(isSafeAdminNextPath("/admin/cases/abc?tab=history")).toBe(true);
    expect(
      resolveAdminRedirectUrl("/admin/cases/abc?tab=history", appUrl).href,
    ).toBe("https://admin.wethru.example/admin/cases/abc?tab=history");
  });

  it.each([
    "//attacker.example",
    "/\\attacker.example",
    "https://attacker.example/admin",
    "javascript:alert(1)",
    "/intake/public-token",
  ])("rejects untrusted next destination %s", (destination) => {
    expect(isSafeAdminNextPath(destination)).toBe(false);
    expect(resolveAdminRedirectUrl(destination, appUrl).href).toBe(
      "https://admin.wethru.example/admin",
    );
  });

  it.each([null, "admin", "/admin\\attacker", "/administer"])(
    "rejects a malformed administrator path %s",
    (destination) => {
      expect(isSafeAdminNextPath(destination)).toBe(false);
    },
  );
});
