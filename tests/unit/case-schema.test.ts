import { describe, expect, it } from "vitest";

import { generateCaseCode } from "@/lib/case-code";
import { createCaseSchema } from "@/lib/schemas/case";

const validInput = {
  businessName: "샘플 스튜디오",
  industryKey: "office_service",
  customerIntro: "대표님, 과거 등록 흐름을 함께 차분하게 확인하겠습니다.",
  expectedCompletionMinutes: 20,
  moduleIds: ["11111111-1111-4111-8111-111111111111"],
  knownFacts: [],
  profileCandidates: [],
  customQuestions: [],
  requestedEvidence: [],
  website: "",
};

describe("case creation schema", () => {
  it("accepts a minimal fictional case", () => {
    expect(createCaseSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects duplicate prefilled keys and too many candidates", () => {
    const duplicateFacts = [
      {
        fieldKey: "sign_name",
        value: "샘플",
        sourceType: "admin_prefill",
        customerCanEdit: true,
      },
      {
        fieldKey: "sign_name",
        value: "샘플2",
        sourceType: "admin_prefill",
        customerCanEdit: true,
      },
    ];
    expect(
      createCaseSchema.safeParse({ ...validInput, knownFacts: duplicateFacts })
        .success,
    ).toBe(false);
    expect(
      createCaseSchema.safeParse({
        ...validInput,
        profileCandidates: Array(11).fill({ displayedName: "후보" }),
      }).success,
    ).toBe(false);
  });

  it("generates non-sequential public-safe case codes", () => {
    const codes = new Set(
      Array.from({ length: 100 }, () => generateCaseCode()),
    );
    expect(codes.size).toBe(100);
    for (const code of codes) expect(code).toMatch(/^WTH-[A-HJ-NP-Z2-9]{10}$/);
  });
});
