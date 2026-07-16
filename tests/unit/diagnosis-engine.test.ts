import { describe, expect, it } from "vitest";

import { DIAGNOSIS_ENGINE_VERSION, diagnoseCase } from "@/lib/diagnosis-engine";
import {
  createEmptyHistoryEvent,
  createEmptyProfileCandidate,
  createEmptyThirdParty,
  intakePayloadSchema,
} from "@/lib/schemas/intake";

function fixture() {
  const history = createEmptyHistoryEvent();
  history.profileName = "샘플 라운지 역삼";
  history.address = "서울시 샘플구 1, 2층";
  history.floor = "2층";
  history.phone = "02-000-0000";
  history.primaryCategory = "라운지";
  history.verificationMethod = "영상 인증";
  history.approvalStatus = "거절";
  history.result = "검색에서 사라짐";

  const profile = createEmptyProfileCandidate();
  profile.displayedName = "역삼 샘플 가라오케";
  profile.displayedAddress = "서울시 샘플구 1";
  profile.displayedFloor = "3층";
  profile.displayedPhone = "02-111-1111";
  profile.displayedWebsite = "https://example.test";
  profile.displayedCategory = "노래방";
  profile.customerControlsProfile = "unknown";
  profile.independentBusinessSignals = {
    entrance: "unknown",
    sign: "needs_confirmation",
  };

  const thirdParty = createEmptyThirdParty();
  thirdParty.partyName = "가상 대행사";
  thirdParty.accountAccessLevel = "owner";

  return intakePayloadSchema.parse({
    schemaVersion: 1,
    answers: {
      sign_name: "샘플",
      registration_name: "샘플 2,3",
      permit_name: "샘플",
      official_address: "서울시 샘플구 1, 2~3층",
      floor_structure: "층별 구분은 확인이 필요해요",
      official_phone: "02-222-2222",
      official_website: "https://official.example.test",
      primary_activity: "일반 유흥 주점업",
      creation_attempt_count: 3,
      suspension_count: 2,
      old_account_access_status: "어떤 계정인지 몰라요",
      appeal_status: "잘 모르겠어요",
      recreated_during_appeal: "있어요",
      third_party_count: 2,
    },
    historyEvents: [history],
    profileCandidates: [profile],
    thirdParties: [thirdParty],
    website: "",
  });
}

describe("diagnosis engine", () => {
  it("returns all versioned hypothesis categories with transparent fields", () => {
    const result = diagnoseCase({ payload: fixture(), evidenceCategories: [] });

    expect(result.engineVersion).toBe(DIAGNOSIS_ENGINE_VERSION);
    expect(result.hypotheses).toHaveLength(13);
    expect(new Set(result.hypotheses.map((item) => item.category)).size).toBe(
      13,
    );
    expect(result.disclaimer).toContain("Google의 비공개");
    for (const hypothesis of result.hypotheses) {
      expect(hypothesis.mustNotConclude.length).toBeGreaterThan(0);
      expect(hypothesis.safeNextAction.length).toBeGreaterThan(0);
      expect(hypothesis.unknownInformation.length).toBeGreaterThan(0);
      expect(["단서 적음", "가능성 있음", "우선 확인 필요"]).toContain(
        hypothesis.confidence,
      );
    }
  });

  it("is deterministic and never makes the final route decision", () => {
    const input = {
      payload: fixture(),
      evidenceCategories: ["entrance_photo"],
    };
    const first = diagnoseCase(input);
    const second = diagnoseCase(input);

    expect(first).toEqual(second);
    expect(first.suggestedPaths.length).toBeGreaterThan(0);
    expect(
      first.suggestedPaths.every((path) => path.requiresAdminDecision),
    ).toBe(true);
  });

  it("reduces the physical evidence score as core evidence is supplied", () => {
    const empty = diagnoseCase({ payload: fixture(), evidenceCategories: [] });
    const supplied = diagnoseCase({
      payload: fixture(),
      evidenceCategories: [
        "exterior_photo",
        "permanent_sign_photo",
        "entrance_photo",
        "operating_permit",
      ],
    });

    expect(supplied.scores.physicalEvidence).toBeLessThan(
      empty.scores.physicalEvidence,
    );
  });
});
