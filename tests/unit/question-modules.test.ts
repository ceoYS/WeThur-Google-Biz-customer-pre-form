import { describe, expect, it } from "vitest";

import {
  composeQuestionModules,
  evaluateQuestionCondition,
  questionDefinitionSchema,
  type SelectedQuestionModule,
} from "@/lib/question-modules";

const modules: SelectedQuestionModule[] = [
  {
    moduleKey: "issue_duplicate_profiles",
    moduleType: "issue",
    sortOrder: 20,
    schemaJson: {
      version: 1,
      questions: [
        {
          key: "candidate_control",
          sectionKey: "profile_candidates",
          label: "직접 관리할 수 있는 프로필이 있나요?",
          type: "single_select",
          options: ["있어요", "없어요", "잘 모르겠어요"],
          sortOrder: 20,
        },
      ],
    },
  },
  {
    moduleKey: "common_core",
    moduleType: "common",
    sortOrder: 0,
    schemaJson: {
      version: 1,
      questions: [
        {
          key: "authority_status",
          sectionKey: "current_business",
          label: "공식적으로 관리를 맡은 사업장이 맞으실까요?",
          type: "single_select",
          options: ["맞아요", "확인이 필요해요"],
          sortOrder: 1,
        },
        {
          key: "candidate_control",
          sectionKey: "profile_candidates",
          label: "중복 키는 먼저 선택된 모듈을 유지합니다.",
          type: "text",
          sortOrder: 99,
        },
      ],
    },
  },
];

describe("question module composition", () => {
  it("is deterministic, section ordered, and removes duplicate module keys", () => {
    const first = composeQuestionModules({ modules });
    const second = composeQuestionModules({ modules: modules.toReversed() });
    expect(first).toEqual(second);
    expect(first.map((question) => question.key)).toEqual([
      "authority_status",
      "candidate_control",
    ]);
  });

  it("adds editable prefill fields and drops legacy goals questions", () => {
    const result = composeQuestionModules({
      modules,
      customQuestions: [
        {
          key: "call_preference",
          sectionKey: "goals",
          label: "통화로 설명하고 싶으신가요?",
          type: "boolean",
          options: [],
          required: false,
          sortOrder: 10,
        },
      ],
      prefilledConfirmations: [
        {
          fieldKey: "official_address",
          label: "이 주소가 맞나요?",
          sortOrder: 2,
        },
      ],
    });
    expect(result.some((question) => question.key === "official_address")).toBe(
      true,
    );
    expect(
      result.find((question) => question.key === "official_address")?.type,
    ).toBe("text");
    expect(result.some((question) => question.key === "call_preference")).toBe(
      false,
    );
  });

  it("does not compose retired outcome questions from an older database catalog", () => {
    const result = composeQuestionModules({
      modules: [
        {
          moduleKey: "legacy_goals",
          moduleType: "common",
          sortOrder: 0,
          schemaJson: {
            version: 1,
            questions: [
              {
                key: "priority_goals",
                sectionKey: "goals",
                label: "이번 작업에서 우선 확인하고 싶은 결과를 골라주세요.",
                type: "multi_select",
                options: ["원인 이해"],
              },
              {
                key: "desired_standard_name",
                sectionKey: "current_business",
                label: "앞으로 사용할 이름",
                type: "text",
              },
            ],
          },
        },
      ],
    });

    expect(result).toEqual([]);
  });

  it("rejects a custom question that would overwrite a module answer", () => {
    expect(() =>
      composeQuestionModules({
        modules,
        customQuestions: [
          {
            key: "authority_status",
            sectionKey: "current_business",
            label: "conflict",
            type: "text",
            options: [],
            required: false,
            sortOrder: 1,
          },
        ],
      }),
    ).toThrow("Duplicate custom question key");
  });

  it("allows a negative credential safety confirmation but rejects collection", () => {
    expect(
      questionDefinitionSchema.safeParse({
        key: "credential_safety_confirmation",
        sectionKey: "confirmation",
        label: "Google 비밀번호와 OTP를 제출하지 않았음을 확인합니다.",
        type: "confirmation",
      }).success,
    ).toBe(true);
    expect(
      questionDefinitionSchema.safeParse({
        key: "account_access_detail",
        sectionKey: "current_business",
        label: "Google 비밀번호를 입력해주세요.",
        type: "text",
      }).success,
    ).toBe(false);
    expect(
      questionDefinitionSchema.safeParse({
        key: "sensitive_data_confirmation",
        sectionKey: "evidence",
        label: "불필요한 민감정보를 가린 뒤 자료를 제출하실 수 있나요?",
        helpText: "Google 비밀번호와 OTP는 제출하지 마세요.",
        type: "single_select",
      }).success,
    ).toBe(true);
  });
});

describe("conditional question logic", () => {
  it("supports equals, lists, selected values, and answered checks", () => {
    const answers = {
      status: "suspended",
      changes: ["phone", "website"],
      note: "기억나요",
    };
    expect(
      evaluateQuestionCondition(
        { field: "status", operator: "equals", value: "suspended" },
        answers,
      ),
    ).toBe(true);
    expect(
      evaluateQuestionCondition(
        { field: "status", operator: "in", value: ["lost", "suspended"] },
        answers,
      ),
    ).toBe(true);
    expect(
      evaluateQuestionCondition(
        { field: "changes", operator: "contains", value: "phone" },
        answers,
      ),
    ).toBe(true);
    expect(
      evaluateQuestionCondition(
        { field: "note", operator: "answered" },
        answers,
      ),
    ).toBe(true);
    expect(
      evaluateQuestionCondition(
        { field: "missing", operator: "answered" },
        answers,
      ),
    ).toBe(false);
  });
});
