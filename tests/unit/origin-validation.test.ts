import { describe, expect, it } from "vitest";

import { isConfiguredOrigin } from "@/lib/origin-validation";

describe("mutation request origins", () => {
  const appUrl = "https://app.wethru.example";

  it("accepts only the configured application origin", () => {
    expect(isConfiguredOrigin("https://app.wethru.example", appUrl)).toBe(true);
    expect(isConfiguredOrigin("https://preview.wethru.example", appUrl)).toBe(
      false,
    );
    expect(isConfiguredOrigin("https://attacker.example", appUrl)).toBe(false);
  });

  it.each([
    null,
    "null",
    "not-a-url",
    "https://app.wethru.example/path",
    "https://app.wethru.example?query=1",
  ])("rejects malformed origin value %s", (origin) => {
    expect(isConfiguredOrigin(origin, appUrl)).toBe(false);
  });
});
