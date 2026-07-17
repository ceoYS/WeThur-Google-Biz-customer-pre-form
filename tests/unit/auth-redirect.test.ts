import { describe, expect, it } from "vitest";

import { resolveAdminRedirectUrl } from "@/lib/auth-redirect";

describe("administrator authentication redirects", () => {
  const appUrl = "https://admin.wethru.example";

  it("keeps valid administrator destinations on the configured origin", () => {
    expect(
      resolveAdminRedirectUrl("/admin/cases/abc?tab=history", appUrl).href,
    ).toBe("https://admin.wethru.example/admin/cases/abc?tab=history");
  });

  it.each([
    "//attacker.example",
    "/\\attacker.example",
    "https://attacker.example/admin",
    "/intake/public-token",
  ])("rejects untrusted next destination %s", (destination) => {
    expect(resolveAdminRedirectUrl(destination, appUrl).href).toBe(
      "https://admin.wethru.example/admin",
    );
  });
});
