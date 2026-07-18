import { describe, expect, it } from "vitest";

import {
  canSelectIntakeStep,
  finalIntakeStepId,
  firstIntakeStepId,
  getIntakeProgress,
  getNextStepId,
  getPreviousStepId,
  getStepIndex,
  intakeStepIds,
  isFinalIntakeStep,
} from "@/lib/intake-navigation";

describe("intake navigation contract", () => {
  it("uses the six fact-collection sections in their canonical order", () => {
    expect(intakeStepIds).toEqual([
      "current_business",
      "history_summary",
      "changes",
      "profile_candidates",
      "evidence",
      "confirmation",
    ]);
    expect(firstIntakeStepId).toBe("current_business");
    expect(finalIntakeStepId).toBe("confirmation");
  });

  it.each([
    ["current_business", "history_summary"],
    ["history_summary", "changes"],
    ["changes", "profile_candidates"],
    ["profile_candidates", "evidence"],
    ["evidence", "confirmation"],
    ["confirmation", "confirmation"],
  ] as const)("moves next from %s to %s", (current, expected) => {
    expect(getNextStepId(current)).toBe(expected);
  });

  it.each([
    ["current_business", "current_business"],
    ["history_summary", "current_business"],
    ["changes", "history_summary"],
    ["profile_candidates", "changes"],
    ["evidence", "profile_candidates"],
    ["confirmation", "evidence"],
  ] as const)("moves previous from %s to %s", (current, expected) => {
    expect(getPreviousStepId(current)).toBe(expected);
  });

  it("keeps every calculated index inside the zero-to-five range", () => {
    expect(intakeStepIds.map(getStepIndex)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(getStepIndex(getPreviousStepId(firstIntakeStepId))).toBe(0);
    expect(getStepIndex(getNextStepId(finalIntakeStepId))).toBe(5);
  });

  it.each([
    ["current_business", 17],
    ["history_summary", 33],
    ["changes", 50],
    ["profile_candidates", 67],
    ["evidence", 83],
    ["confirmation", 100],
  ] as const)("maps %s to %d percent", (step, expected) => {
    expect(getIntakeProgress(step)).toBe(expected);
  });

  it("allows sidebar selection only for the current or an earlier step", () => {
    expect(canSelectIntakeStep("current_business", "confirmation")).toBe(false);
    expect(canSelectIntakeStep("changes", "history_summary")).toBe(true);
    expect(canSelectIntakeStep("changes", "changes")).toBe(true);
    expect(canSelectIntakeStep("changes", "evidence")).toBe(false);
  });

  it("shows final-submit semantics only for the sixth step", () => {
    for (const step of intakeStepIds.slice(0, -1)) {
      expect(isFinalIntakeStep(step)).toBe(false);
    }
    expect(isFinalIntakeStep(finalIntakeStepId)).toBe(true);
  });
});
