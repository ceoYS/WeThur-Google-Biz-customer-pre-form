import { describe, expect, it } from "vitest";

import { diagnoseCase } from "@/lib/diagnosis-engine";
import { generateMissingInformation } from "@/lib/missing-information-engine";
import {
  createEmptyProfileCandidate,
  intakePayloadSchema,
} from "@/lib/schemas/intake";

function input() {
  const profile = createEmptyProfileCandidate();
  profile.displayedName = "가상 업체 강남";
  profile.displayedPhone = "02-111-1111";
  profile.customerControlsProfile = "unknown";
  const payload = intakePayloadSchema.parse({
    schemaVersion: 1,
    answers: {
      sign_name: "가상 업체",
      registration_name: "가상 업체 2",
      official_phone: "02-222-2222",
      old_account_access_status: "어떤 계정인지 몰라요",
      appeal_status: "잘 모르겠어요",
    },
    historyEvents: [],
    profileCandidates: [profile],
    thirdParties: [],
    website: "",
  });
  const diagnosis = diagnoseCase({ payload, evidenceCategories: [] });
  return { payload, diagnosis, evidenceCategories: [] as string[] };
}

describe("missing information engine", () => {
  it("orders access and appeal confirmation before lower priority items", () => {
    const result = generateMissingInformation(input());
    expect(result.items[0]?.key).toBe("old_account_access");
    expect(result.items[1]?.key).toBe("appeal_status");
    expect(result.items.some((item) => item.category === "contradiction")).toBe(
      true,
    );
    expect(result.items.some((item) => item.category === "evidence")).toBe(
      true,
    );
  });

  it("generates friendly questions without credential requests", () => {
    const result = generateMissingInformation(input());
    const text = result.suggestedQuestions
      .map((item) => item.message)
      .join(" ");
    expect(text).toContain("비밀번호나 인증번호는 보내지 않으셔도 됩니다");
    expect(
      result.suggestedQuestions.some((item) => item.key === "profile_control"),
    ).toBe(true);
  });

  it("is deterministic and removes supplied evidence from the checklist", () => {
    const first = generateMissingInformation(input());
    const second = generateMissingInformation(input());
    expect(first).toEqual(second);
    const supplied = generateMissingInformation({
      ...input(),
      evidenceCategories: ["permanent_sign_photo"],
    });
    expect(
      supplied.items.some(
        (item) => item.key === "evidence_permanent_sign_photo",
      ),
    ).toBe(false);
  });
});
