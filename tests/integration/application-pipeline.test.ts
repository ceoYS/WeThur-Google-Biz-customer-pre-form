import { describe, expect, it } from "vitest";

import { canTransitionCaseStatus } from "@/lib/case-status";
import { diagnoseCase } from "@/lib/diagnosis-engine";
import { validateEvidenceFile } from "@/lib/file-validation";
import { canTransitionFollowUpStatus } from "@/lib/follow-up-status";
import {
  canSubmitIntake,
  findMissingRequiredAnswers,
} from "@/lib/intake-validation";
import { generateMissingInformation } from "@/lib/missing-information-engine";
import {
  composeQuestionModules,
  type SelectedQuestionModule,
} from "@/lib/question-modules";
import { createCaseSchema } from "@/lib/schemas/case";
import {
  createEmptyHistoryEvent,
  createEmptyProfileCandidate,
  intakePayloadSchema,
} from "@/lib/schemas/intake";
import {
  buildIntakeUrl,
  generateIntakeToken,
  hashIntakeToken,
  verifyIntakeTokenHash,
} from "@/lib/tokens";

const moduleIds = {
  common: "11111111-1111-4111-8111-111111111111",
  industry: "22222222-2222-4222-8222-222222222222",
  issue: "33333333-3333-4333-8333-333333333333",
};

const modules: SelectedQuestionModule[] = [
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
          label: "공식적으로 관리를 맡고 계신가요?",
          type: "single_select",
          options: ["맞아요", "확인이 필요해요"],
          required: true,
          sortOrder: 1,
        },
        {
          key: "final_confirmation",
          sectionKey: "confirmation",
          label: "비밀번호와 OTP를 제출하지 않았음을 확인합니다.",
          type: "confirmation",
          required: true,
          sortOrder: 1,
        },
      ],
    },
  },
  {
    moduleKey: "industry_nightlife",
    moduleType: "industry",
    sortOrder: 10,
    schemaJson: { version: 1, questions: [] },
  },
  {
    moduleKey: "issue_prior_suspension",
    moduleType: "issue",
    sortOrder: 20,
    schemaJson: {
      version: 1,
      questions: [
        {
          key: "appeal_status",
          sectionKey: "history_summary",
          label: "이의신청 상태를 알고 계신가요?",
          type: "single_select",
          options: ["진행 중이에요", "잘 모르겠어요"],
          sortOrder: 1,
        },
      ],
    },
  },
];

describe("case-to-diagnosis application pipeline", () => {
  it("validates setup, creates a secure link, saves/resumes, submits once, and diagnoses", () => {
    const setup = createCaseSchema.parse({
      businessName: "가상 테스트 라운지",
      industryKey: "industry_nightlife",
      customerName: "테스트 대표님",
      customerContactChannel: "테스트 채널",
      customerIntro:
        "누가 잘못했는지 찾는 설문이 아니라 같은 문제가 반복되지 않도록 과거 흐름을 정리합니다.",
      expectedCompletionMinutes: 20,
      moduleIds: Object.values(moduleIds),
      knownFacts: [
        {
          fieldKey: "official_address",
          value: "서울시 가상구 1",
          sourceType: "admin_prefill",
          customerCanEdit: true,
        },
      ],
      profileCandidates: [{ displayedName: "가상 테스트 라운지 후보" }],
      customQuestions: [],
      requestedEvidence: [
        {
          evidenceCategory: "permanent_sign_photo",
          label: "상시 간판 사진",
          required: false,
        },
      ],
      assignedAdminId: "44444444-4444-4444-8444-444444444444",
      website: "",
    });
    expect(setup.moduleIds).toHaveLength(3);

    const token = generateIntakeToken();
    const secret = "integration-test-secret-at-least-32-characters";
    const digest = hashIntakeToken(token, secret);
    expect(buildIntakeUrl("https://example.test", token)).toBe(
      `https://example.test/intake/${token}`,
    );
    expect(verifyIntakeTokenHash(token, digest, secret)).toBe(true);

    const questions = composeQuestionModules({
      modules,
      prefilledConfirmations: [
        {
          fieldKey: "official_address",
          label: "미리 확인한 주소가 맞나요?",
          sortOrder: 2,
        },
      ],
    });
    const history = createEmptyHistoryEvent();
    history.approximatePeriod = "2025년 봄쯤";
    history.profileName = "가상 테스트 라운지";
    history.result = "검색에서 사라짐";
    const profile = createEmptyProfileCandidate();
    profile.displayedName = "가상 테스트 라운지 후보";
    profile.customerControlsProfile = "unknown";
    const draft = intakePayloadSchema.parse({
      schemaVersion: 1,
      answers: {
        authority_status: "맞아요",
        appeal_status: "잘 모르겠어요",
        old_account_access_status: "어떤 계정인지 몰라요",
        final_confirmation: true,
      },
      historyEvents: [history],
      profileCandidates: [profile],
      thirdParties: [],
      website: "",
    });
    const resumed = intakePayloadSchema.parse(
      JSON.parse(JSON.stringify(draft)),
    );
    expect(resumed).toEqual(draft);
    expect(findMissingRequiredAnswers(questions, resumed.answers)).toEqual([]);

    let intakeStatus = "draft";
    expect(canSubmitIntake(intakeStatus)).toBe(true);
    intakeStatus = "submitted";
    expect(canSubmitIntake(intakeStatus)).toBe(false);

    const diagnosis = diagnoseCase({
      payload: resumed,
      evidenceCategories: [],
    });
    const missing = generateMissingInformation({
      payload: resumed,
      diagnosis,
      evidenceCategories: [],
    });
    expect(diagnosis.hypotheses).toHaveLength(13);
    expect(missing.items[0]?.key).toBe("old_account_access");
  });

  it("validates evidence and administrator workflow transitions", () => {
    const file = validateEvidenceFile({
      name: "fixture.png",
      declaredMime: "image/png",
      sizeBytes: 68,
      firstBytes: new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]),
    });
    expect(file.mimeType).toBe("image/png");
    expect(canTransitionCaseStatus("new_submission", "initial_review")).toBe(
      true,
    );
    expect(canTransitionCaseStatus("initial_review", "completed")).toBe(false);
    expect(canTransitionFollowUpStatus("draft", "sent")).toBe(true);
    expect(canTransitionFollowUpStatus("sent", "responded")).toBe(true);
  });
});
