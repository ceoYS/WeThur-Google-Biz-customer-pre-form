import { describe, expect, it } from "vitest";

import {
  canSubmitIntake,
  findMissingRequiredAnswers,
} from "@/lib/intake-validation";
import type { ComposedQuestion } from "@/lib/question-modules";

const requiredConfirmation: ComposedQuestion = {
  key: "final_confirmation",
  sectionKey: "confirmation",
  label: "마지막 확인",
  type: "confirmation",
  options: [],
  required: true,
  sortOrder: 1,
  source: "module",
  sourceKey: "common_confirmation",
};

describe("final intake validation", () => {
  it("requires a true confirmation and respects conditional disclosure", () => {
    const conditional: ComposedQuestion = {
      ...requiredConfirmation,
      key: "appeal_detail",
      label: "이의신청 내용",
      type: "text",
      condition: {
        field: "appeal_status",
        operator: "equals",
        value: "in_progress",
      },
    };
    expect(findMissingRequiredAnswers([requiredConfirmation], {})).toHaveLength(
      1,
    );
    expect(
      findMissingRequiredAnswers([requiredConfirmation], {
        final_confirmation: true,
      }),
    ).toHaveLength(0);
    expect(
      findMissingRequiredAnswers([conditional], { appeal_status: "unknown" }),
    ).toHaveLength(0);
    expect(
      findMissingRequiredAnswers([conditional], {
        appeal_status: "in_progress",
      }),
    ).toHaveLength(1);
  });

  it("prevents duplicate final submission unless an administrator reopens", () => {
    expect(canSubmitIntake("link_ready")).toBe(true);
    expect(canSubmitIntake("draft")).toBe(true);
    expect(canSubmitIntake("reopened")).toBe(true);
    expect(canSubmitIntake("submitted")).toBe(false);
  });
});
