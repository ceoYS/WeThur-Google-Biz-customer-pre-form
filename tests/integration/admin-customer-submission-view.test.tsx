// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CustomerSubmissionView } from "@/components/admin/workspace/customer-submission-view";
import type { CaseWorkspace } from "@/lib/case-workspace";

afterEach(cleanup);

describe("administrator customer submission view", () => {
  it("shows new and retired customer answers in seven Korean groups", () => {
    const workspace = createWorkspace();
    render(<CustomerSubmissionView workspace={workspace} />);

    for (const title of [
      "작성자와 권한",
      "현재 사업장",
      "과거 Google 등록·정지 이력",
      "담당자·대행사·변경 이력",
      "현재 지도 프로필 후보",
      "제출 자료",
      "최종 확인",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }

    expect(screen.getByText("사업장과의 관계")).toBeInTheDocument();
    expect(screen.getByText("공식 판단·결정 권한")).toBeInTheDocument();
    expect(screen.getByText("상시 간판명")).toBeInTheDocument();
    expect(screen.getByText("영업허가증·신고증상 업소명")).toBeInTheDocument();
    expect(screen.getByText("기존 우선 확인 요청")).toBeInTheDocument();
    expect(screen.getByText("확인 필요")).toBeInTheDocument();
    expect(screen.getAllByText("예").length).toBeGreaterThan(0);
    expect(screen.getByText("아니오")).toBeInTheDocument();
    expect(screen.getAllByText("없음").length).toBeGreaterThan(0);
    expect(screen.getAllByText("미응답").length).toBeGreaterThan(0);
    expect(screen.getByText("영상 인증, 전화 또는 문자")).toBeInTheDocument();
    expect(
      screen.getByText("고객이 직접 입력한 설명은 그대로 유지됩니다."),
    ).toBeInTheDocument();

    const profileGroup = screen
      .getByRole("heading", { name: "현재 지도 프로필 후보" })
      .closest("section");
    expect(profileGroup).not.toBeNull();
    expect(within(profileGroup!).getByText("가상 후보 프로필")).toBeInTheDocument();
    expect(
      within(profileGroup!).getAllByText("미확인").length,
    ).toBeGreaterThan(0);
  });

  it("keeps internal keys and original JSON only inside technical details", () => {
    render(<CustomerSubmissionView workspace={createWorkspace()} />);

    for (const key of [
      "case_id",
      "relationship_to_business",
      "authority_status",
      "priority_goals",
      "custom_changes_note",
    ]) {
      const technicalOccurrences = screen.getAllByText(key);
      expect(technicalOccurrences.length).toBeGreaterThan(0);
      for (const occurrence of technicalOccurrences) {
        expect(occurrence.closest("details")).not.toBeNull();
      }
    }

    const details = screen.getByText("기술 정보 보기").closest("details");
    expect(details).not.toHaveAttribute("open");
  });
});

function createWorkspace(): CaseWorkspace {
  const answers = {
    case_id: "33333333-3333-4333-8333-333333333333",
    relationship_to_business: "representative",
    authority_status: "needs_confirmation",
    sign_name: "가상 상시 간판",
    permit_name: "",
    verification_methods_used: ["영상 인증", "전화 또는 문자"],
    floor_independence_signals: {},
    custom_changes_note: "고객이 직접 입력한 설명은 그대로 유지됩니다.",
    priority_goals: ["원인 이해"],
    final_confirmation: true,
    credential_confirmation: false,
    scope_confirmation: true,
  };
  return {
    case: {
      id: "11111111-1111-4111-8111-111111111111",
      case_code: "CASE-TEST",
      business_name: "가상 테스트 사업장",
      industry_key: "test",
      customer_name: "가상 작성자",
      customer_phone: null,
      customer_contact_channel: null,
      customer_intro: "테스트",
      expected_completion_minutes: 20,
      token_status: "revoked",
      status: "new_submission",
      intake_status: "submitted",
      assigned_admin_id: null,
      created_at: "2026-07-19T00:00:00.000Z",
      updated_at: "2026-07-19T00:00:00.000Z",
      submitted_at: "2026-07-19T00:00:00.000Z",
      completed_at: null,
      retention_review_at: null,
    },
    moduleTitles: ["공통 질문"],
    currentBusiness: {
      customer_preferred_title: null,
      preferred_contact_method: null,
      relationship_to_business: "representative",
      authority_status: "needs_confirmation",
      sign_name: "가상 상시 간판",
      entrance_sign_name: null,
      registration_name: null,
      permit_name: null,
      official_address: null,
      building_name: null,
      floor_structure: null,
      independent_business_count: null,
      entrance_structure: null,
      floor_independence_signals: {},
      official_phone: null,
      official_website: null,
      primary_activity: null,
      opening_hours: null,
      desired_standard_name: null,
      keyword_name_history: null,
      raw_notes: null,
    },
    historySummary: null,
    historyEvents: [],
    profiles: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        sort_order: 0,
        maps_url: "https://maps.example.test/synthetic",
        displayed_name: "가상 후보 프로필",
        displayed_address: null,
        displayed_floor: null,
        map_pin_notes: null,
        displayed_phone: null,
        displayed_website: null,
        displayed_category: null,
        rating: null,
        review_count: null,
        possible_creator: null,
        customer_controls_profile: "unknown",
        ownership_request_status: "unknown",
        relation_notes: null,
        independent_business_signals: {},
      },
    ],
    thirdParties: [],
    evidence: [],
    diagnosis: null,
    facts: [],
    followUps: [],
    notes: [],
    activity: [],
    customerAnswers: answers,
    questionMetadata: {
      custom_changes_note: {
        label: "정지 전후 변경에 관해 추가로 알려주실 내용",
        sectionKey: "changes",
      },
    },
    finalIntakePayload: {
      schemaVersion: 1,
      answers,
      historyEvents: [],
      profileCandidates: [],
      thirdParties: [],
      website: "",
    },
  };
}
