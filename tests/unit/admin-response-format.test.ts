import { describe, expect, it } from "vitest";

import {
  formatAdminAnswerValue,
  getAdminAnswerGroup,
  getAdminAnswerLabel,
} from "@/lib/admin-response-format";

describe("administrator response localization", () => {
  it("uses Korean labels for normalized, retired, and dynamic answers", () => {
    expect(getAdminAnswerLabel("case_id")).toBe("사건 ID");
    expect(getAdminAnswerLabel("relationship_to_business")).toBe(
      "사업장과의 관계",
    );
    expect(getAdminAnswerLabel("authority_status")).toBe(
      "공식 판단·결정 권한",
    );
    expect(getAdminAnswerLabel("official_website")).toBe(
      "공식 웹사이트·SNS",
    );
    expect(getAdminAnswerLabel("priority_goals")).toBe(
      "기존 우선 확인 요청",
    );
    expect(
      getAdminAnswerLabel("custom_legacy_answer", {
        custom_legacy_answer: "과거 사건의 추가 확인 내용",
      }),
    ).toBe("과거 사건의 추가 확인 내용");
  });

  it("formats missing, boolean, array, object, and enum values for people", () => {
    expect(formatAdminAnswerValue("authority_status", undefined)).toBe(
      "미응답",
    );
    expect(formatAdminAnswerValue("official_phone", "")).toBe("미응답");
    expect(formatAdminAnswerValue("final_confirmation", true)).toBe("예");
    expect(formatAdminAnswerValue("scope_confirmation", false)).toBe(
      "아니오",
    );
    expect(formatAdminAnswerValue("verification_methods_used", [])).toBe(
      "없음",
    );
    expect(
      formatAdminAnswerValue("verification_methods_used", [
        "영상 인증",
        "전화 또는 문자",
      ]),
    ).toBe("영상 인증, 전화 또는 문자");
    expect(formatAdminAnswerValue("floor_independence_signals", {})).toBe(
      "없음",
    );
    expect(
      formatAdminAnswerValue("floor_independence_signals", {
        separate_sign: true,
        separate_staff: false,
      }),
    ).toBe("별도 간판: 예 · 별도 직원: 아니오");
    expect(
      formatAdminAnswerValue("authority_status", "needs_confirmation"),
    ).toBe("확인 필요");
    expect(formatAdminAnswerValue("authority_status", "confirmed")).toBe(
      "확인됨",
    );
    expect(
      formatAdminAnswerValue("relationship_to_business", "representative"),
    ).toBe("대표자");
    expect(formatAdminAnswerValue("party_type", "employee")).toBe(
      "직원·담당자",
    );
    expect(formatAdminAnswerValue("party_type", "agency")).toBe("대행사");
    expect(formatAdminAnswerValue("party_type", "unknown")).toBe("미확인");
  });

  it("preserves customer free text and does not mutate original keys", () => {
    const answers = {
      sign_name: "고객이 입력한 원문\n둘째 줄도 그대로",
      priority_goals: ["원인 이해", "기존 프로필 복구"],
    };
    const before = structuredClone(answers);

    expect(formatAdminAnswerValue("sign_name", answers.sign_name)).toBe(
      "고객이 입력한 원문\n둘째 줄도 그대로",
    );
    expect(formatAdminAnswerValue("priority_goals", answers.priority_goals)).toBe(
      "원인 이해, 기존 프로필 복구",
    );
    expect(answers).toEqual(before);
    expect(Object.keys(answers)).toEqual(["sign_name", "priority_goals"]);
  });

  it("groups legacy goals safely without restoring them to the new intake", () => {
    expect(getAdminAnswerGroup("priority_goals", "goals")).toBe(
      "confirmation",
    );
    expect(getAdminAnswerGroup("custom_history", "history_summary")).toBe(
      "history",
    );
    expect(getAdminAnswerGroup("custom_new", "changes")).toBe("changes");
  });
});
