import { describe, expect, it } from "vitest";

import {
  getAllowedAdminEmails,
  isAllowedAdminEmail,
} from "@/lib/admin-allowlist";

describe("administrator allowlist", () => {
  const source = "Owner@Example.com, consultant@example.com ,";

  it("normalizes configured addresses", () => {
    expect([...getAllowedAdminEmails(source)]).toEqual([
      "owner@example.com",
      "consultant@example.com",
    ]);
  });

  it("does not authorize an arbitrary authenticated account", () => {
    expect(isAllowedAdminEmail("OWNER@example.com", source)).toBe(true);
    expect(isAllowedAdminEmail("other@example.com", source)).toBe(false);
    expect(isAllowedAdminEmail(null, source)).toBe(false);
  });
});
