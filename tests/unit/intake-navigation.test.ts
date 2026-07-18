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
  it("uses the seven rendered questionnaire sections in their configured order", () => {
    expect(intakeStepIds).toEqual([
      "current_business",
      "history_summary",
      "changes",
      "profile_candidates",
      "evidence",
      "goals",
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
    ["evidence", "goals"],
    ["goals", "confirmation"],
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
    ["goals", "evidence"],
    ["confirmation", "goals"],
  ] as const)("moves previous from %s to %s", (current, expected) => {
    expect(getPreviousStepId(current)).toBe(expected);
  });

  it("keeps every calculated index inside the zero-to-six range", () => {
    expect(intakeStepIds.map(getStepIndex)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(getStepIndex(getPreviousStepId(firstIntakeStepId))).toBe(0);
    expect(getStepIndex(getNextStepId(finalIntakeStepId))).toBe(6);
  });

  it.each([
    ["current_business", 14],
    ["history_summary", 29],
    ["changes", 43],
    ["profile_candidates", 57],
    ["evidence", 71],
    ["goals", 86],
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

  it("shows final-submit semantics only for the seventh step", () => {
    for (const step of intakeStepIds.slice(0, -1)) {
      expect(isFinalIntakeStep(step)).toBe(false);
    }
    expect(isFinalIntakeStep(finalIntakeStepId)).toBe(true);
  });
});
