import { describe, expect, it } from "vitest";

import {
  canTransitionCaseStatus,
  getAllowedCaseStatuses,
} from "@/lib/case-status";

describe("case status transitions", () => {
  it("allows the normal review path and idempotent updates", () => {
    expect(canTransitionCaseStatus("new_submission", "initial_review")).toBe(
      true,
    );
    expect(canTransitionCaseStatus("initial_review", "hypothesis_review")).toBe(
      true,
    );
    expect(canTransitionCaseStatus("in_progress", "completed")).toBe(true);
    expect(canTransitionCaseStatus("completed", "completed")).toBe(true);
  });

  it("prevents unsupported jumps", () => {
    expect(canTransitionCaseStatus("link_ready", "completed")).toBe(false);
    expect(canTransitionCaseStatus("new_submission", "completed")).toBe(false);
    expect(getAllowedCaseStatuses("link_ready")).not.toContain("route_decided");
  });
});
