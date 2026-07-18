import {
  defaultRequestedEvidence,
  requiredInformationMatrix,
} from "@/lib/required-information";

export const adminResponseGroupDefinitions = [
  ["author", "작성자와 권한"],
  ["business", "현재 사업장"],
  ["history", "과거 Google 등록·정지 이력"],
  ["changes", "담당자·대행사·변경 이력"],
  ["profiles", "현재 지도 프로필 후보"],
  ["evidence", "제출 자료"],
  ["confirmation", "최종 확인"],
] as const;

export type AdminResponseGroup =
  (typeof adminResponseGroupDefinitions)[number][0];

const matrixLabels = Object.fromEntries(
  requiredInformationMatrix.flatMap((information) =>
    information.keys
      .filter((key) => !key.includes("."))
      .map((key) => [key, information.item]),
  ),
);

const answerLabels: Record<string, string> = {
  case_id: "사건 ID",
  customer_name: "작성자 이름",
  customer_phone: "작성자 전화번호",
  customer_contact_channel: "연락 채널",
  customer_preferred_title: "고객 호칭",
  preferred_contact_method: "연락 방법",
  relationship_to_business: "사업장과의 관계",
  authority_status: "공식 판단·결정 권한",
  sign_name: "상시 간판명",
  entrance_sign_name: "출입구 표시명",
  registration_name: "사업자등록상 상호",
  permit_name: "영업허가증·신고증상 업소명",
  official_address: "실제 사업장 주소",
  building_name: "건물명",
  floor_structure: "사용 층 및 운영 구조",
  floor_separation: "층별 운영 구분",
  independent_business_count: "독립 사업체 수",
  entrance_structure: "출입구 구조",
  floor_independence_signals: "층별 독립 운영 근거",
  primary_activity: "실제 주요 영업 내용",
  opening_hours: "실제 영업시간",
  official_phone: "공식 전화번호",
  official_website: "공식 웹사이트·SNS",
  desired_standard_name: "기존 요청 기준 업체명",
  keyword_name_history: "과거 키워드 포함 업체명",
  raw_notes: "전체 사건 흐름",
  first_registration_period: "최초 등록 시기",
  creation_attempt_count: "생성·재등록 횟수",
  suspension_count: "정지·검색 제외 횟수",
  account_count: "사용한 Google 계정 수",
  third_party_count: "참여한 담당자·대행사 수",
  old_account_access_status: "과거 계정 로그인 가능 여부",
  appeal_status: "이의신청·재검토 상태",
  recreated_during_appeal: "결과 대기 중 다른 프로필 생성 여부",
  overall_history: "전체 사건 흐름",
  verification_methods_used: "시도하거나 요청받은 인증 방식",
  google_notice_type: "Google 안내·정지 사유",
  approximate_period: "대략적인 시기",
  handled_by: "진행 담당자",
  handler_type: "담당자 유형",
  account_label: "Google 계정 구분",
  profile_name: "당시 프로필 이름",
  address: "당시 등록 주소",
  floor: "당시 등록 층",
  map_pin_notes: "지도 핀 메모",
  phone: "당시 등록 전화번호",
  website: "당시 등록 웹사이트",
  primary_category: "당시 주 카테고리",
  additional_categories: "추가 카테고리",
  verification_method: "인증 방식",
  approval_status: "인증·승인 상태",
  final_result: "최종 결과",
  google_message: "Google 안내 내용",
  changes_before_result: "결과 전 변경 내용",
  appeal_pending_when_recreated: "재생성 당시 이의신청 상태",
  same_account_other_suspensions: "같은 계정의 다른 정지 단서",
  ownership_change_notes: "소유권·관리자 변경 내용",
  evidence_notes: "증빙 메모",
  maps_url: "Google Maps 링크",
  displayed_name: "표시 이름",
  displayed_address: "표시 주소",
  displayed_floor: "표시 층",
  displayed_phone: "표시 전화번호",
  displayed_website: "표시 웹사이트",
  displayed_category: "표시 카테고리",
  rating: "평점",
  review_count: "리뷰 수",
  possible_creator: "알려진 등록자·관리자",
  customer_controls_profile: "고객 계정의 관리 가능 여부",
  ownership_request_status: "소유권 요청 상태",
  relation_notes: "고객 사업장과의 관계",
  independent_business_signals: "독립 사업장 근거",
  party_name: "담당자·대행사 이름",
  party_type: "담당 유형",
  work_requested: "요청한 작업",
  account_access_level: "계정 접근 수준",
  source_type: "정보 출처",
  changes_made: "수행한 변경",
  notes: "추가 메모",
  evidence_category: "자료 유형",
  original_filename: "파일명",
  customer_description: "고객 설명",
  uploaded_by_type: "제출자",
  created_at: "제출 시각",
  final_confirmation: "기억과 확인 가능한 자료 기준 확인",
  credential_confirmation: "비밀번호·OTP·복구코드 미제출 확인",
  scope_confirmation: "승인·복구·삭제·노출 비보장 확인",
  priority_goals: "기존 우선 확인 요청",
  success_definition: "기존 완료 기준 답변",
  process_expectation: "기존 진행 과정 요청",
  future_location_standard: "향후 지점 운영 기준",
  separate_sign: "별도 간판",
  separate_entrance: "별도 출입구",
  separate_staff: "별도 직원",
  separate_checkout: "별도 계산대",
  separate_phone: "별도 전화번호",
  separate_website: "별도 웹사이트",
  separate_permit: "별도 영업허가",
};

const answerGroups: Partial<Record<string, AdminResponseGroup>> = {
  customer_name: "author",
  customer_phone: "author",
  customer_contact_channel: "author",
  customer_preferred_title: "author",
  preferred_contact_method: "author",
  relationship_to_business: "author",
  authority_status: "author",
  final_confirmation: "confirmation",
  credential_confirmation: "confirmation",
  scope_confirmation: "confirmation",
  priority_goals: "confirmation",
  success_definition: "confirmation",
  process_expectation: "confirmation",
  future_location_standard: "confirmation",
};

const sectionGroups: Record<string, AdminResponseGroup> = {
  current_business: "business",
  history_summary: "history",
  changes: "changes",
  profile_candidates: "profiles",
  evidence: "evidence",
  confirmation: "confirmation",
  goals: "confirmation",
};

const commonEnumLabels: Record<string, string> = {
  needs_confirmation: "확인 필요",
  confirmed: "확인됨",
  representative: "대표자",
  employee: "직원·담당자",
  agency: "대행사",
  unknown: "미확인",
  yes: "예",
  no: "아니오",
  not_applicable: "해당 없음",
};

const enumLabelsByKey: Record<string, Record<string, string>> = {
  relationship_to_business: {
    ...commonEnumLabels,
    owner: "대표자·소유자",
    manager: "관리 책임자",
  },
  authority_status: {
    ...commonEnumLabels,
    not_authorized: "공식 권한 없음",
  },
  handler_type: {
    ...commonEnumLabels,
    booking_manager: "예약 담당자",
    marketer: "마케터",
    webmaster: "웹사이트 관리자",
  },
  party_type: {
    ...commonEnumLabels,
    booking_manager: "예약 담당자",
    marketer: "마케터",
    webmaster: "웹사이트 관리자",
  },
  account_access_level: {
    owner: "소유자",
    manager: "관리자",
    temporary: "일시적 접근",
    none: "접근 없음",
    unknown: "미확인",
  },
  old_account_access_status: {
    accessible: "로그인 가능",
    inaccessible: "로그인 불가",
    unknown_account: "계정 미확인",
    unknown: "미확인",
  },
  appeal_status: {
    in_progress: "진행 중",
    approved: "승인됨",
    rejected: "거절됨",
    never_submitted: "신청하지 않음",
    unknown: "미확인",
  },
  recreated_during_appeal: commonEnumLabels,
  customer_controls_profile: {
    ...commonEnumLabels,
    possible: "관리 가능성 있음",
  },
  ownership_request_status: {
    possible: "요청 가능성 있음",
    requested: "요청함",
    approved: "승인됨",
    rejected: "거절됨",
    unknown: "미확인",
  },
  uploaded_by_type: {
    customer: "고객",
    admin: "관리자",
  },
  source_type: {
    intake_answer: "고객 제출 답변",
    admin_prefill: "관리자 사전 입력",
    customer_statement: "고객 진술",
    document: "제출 문서",
    public_source: "공개 자료",
    unknown: "미확인",
  },
  separate_sign: commonEnumLabels,
  separate_entrance: commonEnumLabels,
  separate_staff: commonEnumLabels,
  separate_checkout: commonEnumLabels,
  separate_phone: commonEnumLabels,
  separate_website: commonEnumLabels,
  separate_permit: commonEnumLabels,
};

const evidenceLabels = Object.fromEntries(
  defaultRequestedEvidence.map((evidence) => [
    evidence.evidenceCategory,
    evidence.label,
  ]),
);

export function getAdminAnswerLabel(
  key: string,
  questionLabels: Record<string, string> = {},
): string {
  return (
    answerLabels[key] ??
    questionLabels[key] ??
    matrixLabels[key] ??
    "추가 제출 정보"
  );
}

export function getAdminAnswerGroup(
  key: string,
  sectionKey?: string,
): AdminResponseGroup {
  return (
    answerGroups[key] ??
    (sectionKey ? sectionGroups[sectionKey] : undefined) ??
    "business"
  );
}

export function isAdminAnswerMissing(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  );
}

export function formatAdminAnswerValue(key: string, value: unknown): string {
  if (isAdminAnswerMissing(value)) return "미응답";
  if (typeof value === "boolean") return value ? "예" : "아니오";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (key === "evidence_category") return evidenceLabels[value] ?? value;
    return enumLabelsByKey[key]?.[value] ?? value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "없음";
    return value
      .map((item) => formatAdminAnswerValue(key, item))
      .join(", ");
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "없음";
    return entries
      .map(
        ([nestedKey, nestedValue]) =>
          `${getAdminAnswerLabel(nestedKey)}: ${formatAdminAnswerValue(
            nestedKey,
            nestedValue,
          )}`,
      )
      .join(" · ");
  }
  return String(value);
}
