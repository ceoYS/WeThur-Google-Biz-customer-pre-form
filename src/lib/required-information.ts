import type { IntakeStepId } from "@/lib/intake-steps";

export type InformationCollectionMode =
  | "admin_prefill"
  | "customer_verify_edit"
  | "customer_answer"
  | "customer_upload"
  | "system_notice"
  | "remove";

export type RequiredInformationItem = {
  category: "business" | "history" | "profile" | "evidence" | "confirmation";
  item: string;
  classification: InformationCollectionMode;
  prefillEligible?: boolean;
  keys: string[];
  operationalUse: string;
};

export const requiredInformationMatrix: RequiredInformationItem[] = [
  {
    category: "business",
    item: "사업자등록상 상호",
    classification: "admin_prefill",
    prefillEligible: true,
    keys: ["registration_name"],
    operationalUse: "간판·허가·프로필 표시 이름의 기준값을 비교합니다.",
  },
  {
    category: "business",
    item: "실제 간판 명칭",
    classification: "customer_answer",
    prefillEligible: true,
    keys: ["sign_name"],
    operationalUse: "Google 표시 이름이 상시 간판과 일치하는지 검토합니다.",
  },
  {
    category: "business",
    item: "출입구 표시 명칭",
    classification: "customer_answer",
    keys: ["entrance_sign_name"],
    operationalUse: "고객이 실제로 찾는 출입구와 프로필 표시를 연결합니다.",
  },
  {
    category: "business",
    item: "영업허가증·신고증 상호",
    classification: "customer_answer",
    keys: ["permit_name"],
    operationalUse: "허가 명칭과 실제 영업·프로필 명칭을 비교합니다.",
  },
  {
    category: "business",
    item: "실제 주소",
    classification: "admin_prefill",
    prefillEligible: true,
    keys: ["official_address"],
    operationalUse: "Maps 주소·핀·고객 출입구의 기준 주소로 사용합니다.",
  },
  {
    category: "business",
    item: "사용 층과 층별 독립 사업 여부",
    classification: "customer_answer",
    prefillEligible: true,
    keys: ["floor_structure", "floor_separation"],
    operationalUse: "한 사업장의 다층 사용인지 별도 사업장인지 판단합니다.",
  },
  {
    category: "business",
    item: "주된 영업 내용",
    classification: "admin_prefill",
    prefillEligible: true,
    keys: ["primary_activity"],
    operationalUse: "실제 영업과 Google 주 카테고리를 비교합니다.",
  },
  {
    category: "business",
    item: "영업시간",
    classification: "customer_answer",
    keys: ["opening_hours"],
    operationalUse: "고객 응대가 가능한 실제 운영 시간인지 확인합니다.",
  },
  {
    category: "business",
    item: "공식 전화·웹사이트",
    classification: "customer_answer",
    prefillEligible: true,
    keys: ["official_phone", "official_website"],
    operationalUse:
      "사업장이 직접 관리하는 연락 자산과 후보 프로필을 비교합니다.",
  },
  {
    category: "business",
    item: "답변자 권한과 사업장 관계",
    classification: "customer_answer",
    keys: ["relationship_to_business", "authority_status"],
    operationalUse: "공식 절차를 진행할 수 있는 관계와 관리 권한을 확인합니다.",
  },
  {
    category: "history",
    item: "최초 등록 시기와 생성·재등록 횟수",
    classification: "customer_answer",
    keys: ["first_registration_period", "creation_attempt_count"],
    operationalUse: "반복 생성 여부와 사건 시작점을 정리합니다.",
  },
  {
    category: "history",
    item: "정지·검색 제외 횟수",
    classification: "admin_prefill",
    prefillEligible: true,
    keys: ["suspension_count", "overall_history"],
    operationalUse: "정지·사라짐의 반복 패턴을 확인합니다.",
  },
  {
    category: "history",
    item: "등록 진행자·업체와 Google 계정 수",
    classification: "customer_answer",
    keys: [
      "third_party_count",
      "account_count",
      "historyEvents",
      "thirdParties",
    ],
    operationalUse: "시도별 관리 주체와 계정 접근 충돌을 구분합니다.",
  },
  {
    category: "history",
    item: "과거 계정 로그인 가능 여부",
    classification: "customer_answer",
    keys: ["old_account_access_status"],
    operationalUse: "기존 프로필·이의신청 상태를 확인할 출발점입니다.",
  },
  {
    category: "history",
    item: "인증 방식",
    classification: "customer_answer",
    keys: ["verification_methods_used", "historyEvents.verificationMethod"],
    operationalUse: "요청된 인증과 실제 현장·권한 조건을 비교합니다.",
  },
  {
    category: "history",
    item: "Google 안내·정지 사유",
    classification: "customer_answer",
    keys: [
      "google_notice_type",
      "historyEvents.googleMessage",
      "past_google_email",
    ],
    operationalUse:
      "추측이 아닌 Google 원문과 당시 결과를 기준으로 검토합니다.",
  },
  {
    category: "history",
    item: "이의신청·재검토 상태와 대기 중 추가 생성",
    classification: "customer_answer",
    keys: ["appeal_status", "recreated_during_appeal"],
    operationalUse: "진행 중인 공식 절차와 새 작업의 충돌을 방지합니다.",
  },
  {
    category: "history",
    item: "전체 사건 흐름",
    classification: "admin_prefill",
    prefillEligible: true,
    keys: ["overall_history", "historyEvents"],
    operationalUse: "각 시도·변경·결과를 시간순으로 연결합니다.",
  },
  {
    category: "profile",
    item: "Maps 링크·표시 이름·주소·층·카테고리·전화·웹사이트",
    classification: "admin_prefill",
    prefillEligible: true,
    keys: [
      "mapsUrl",
      "displayedName",
      "displayedAddress",
      "displayedFloor",
      "displayedCategory",
      "displayedPhone",
      "displayedWebsite",
    ],
    operationalUse: "후보 프로필을 동일 기준으로 나란히 비교합니다.",
  },
  {
    category: "profile",
    item: "사업장 관계·등록자·관리 및 소유권 요청 가능 여부",
    classification: "customer_answer",
    keys: [
      "relationNotes",
      "possibleCreator",
      "customerControlsProfile",
      "ownershipRequestStatus",
    ],
    operationalUse: "기존 프로필 접근·소유권 요청 경로를 판단합니다.",
  },
  ...(
    [
      ["사업자등록증", "business_registration"],
      ["영업허가증 또는 신고증", "operating_permit"],
      ["건물 외관", "exterior_photo"],
      ["상시 간판", "permanent_sign_photo"],
      ["고객 출입구", "entrance_photo"],
      ["층별 안내·독립 운영 확인 자료", "floor_operation_evidence"],
      ["과거 Google 이메일·정지 화면", "past_google_email"],
      ["현재 지도 프로필 화면", "current_maps_profile"],
      ["전화·웹사이트 관리 증빙", "contact_control_evidence"],
    ] as const
  ).map(([item, key]) => ({
    category: "evidence" as const,
    item,
    classification: "customer_upload" as const,
    keys: [key],
    operationalUse:
      "공식 정보와 실제 운영·관리 상태를 문서 또는 화면으로 확인합니다.",
  })),
  {
    category: "confirmation",
    item: "기억과 확인 가능한 자료 기준",
    classification: "system_notice",
    keys: ["final_confirmation"],
    operationalUse: "추정 답변을 확인된 사실로 오인하지 않도록 합니다.",
  },
  {
    category: "confirmation",
    item: "비밀번호·OTP·복구코드 미제출",
    classification: "system_notice",
    keys: ["credential_confirmation"],
    operationalUse: "계정 보안정보 수집을 차단합니다.",
  },
  {
    category: "confirmation",
    item: "승인·복구·삭제·노출 비보장",
    classification: "system_notice",
    keys: ["scope_confirmation"],
    operationalUse: "진단 범위와 Google의 최종 결정 권한을 명확히 합니다.",
  },
  {
    category: "confirmation",
    item: "고객의 기대 결과·과정 선호",
    classification: "remove",
    keys: ["priority_goals", "success_definition", "process_expectation"],
    operationalUse:
      "고객 질문이 아니라 서비스 안내와 관리자 경로 판단으로 처리합니다.",
  },
];

export const defaultRequestedEvidence = (
  [
    ["business_registration", "사업자등록증"],
    ["operating_permit", "영업허가증 또는 신고증"],
    ["exterior_photo", "건물 외관 사진"],
    ["permanent_sign_photo", "상시 간판 사진"],
    ["entrance_photo", "고객 출입구 사진"],
    ["floor_operation_evidence", "층별 안내·독립 운영 확인 자료"],
    ["past_google_email", "과거 Google 이메일·정지 화면"],
    ["current_maps_profile", "현재 지도 프로필 화면"],
    ["contact_control_evidence", "전화·웹사이트 관리 증빙"],
  ] as const
).map(([evidenceCategory, label]) => ({
  evidenceCategory,
  label,
  helpText: "불필요한 개인정보는 가린 뒤 제출해주세요.",
  required: false,
}));

export const prefillFieldPresentation: Record<
  string,
  { label: string; sectionKey: IntakeStepId }
> = {
  official_address: {
    label:
      "미리 확인한 실제 사업장 주소입니다. 맞는지 확인하고 다르면 수정해주세요.",
    sectionKey: "current_business",
  },
  registration_name: {
    label:
      "미리 확인한 사업자등록 상호입니다. 맞는지 확인하고 다르면 수정해주세요.",
    sectionKey: "current_business",
  },
  sign_name: {
    label:
      "미리 확인한 상시 간판명입니다. 맞는지 확인하고 다르면 수정해주세요.",
    sectionKey: "current_business",
  },
  floor_structure: {
    label:
      "미리 확인한 사용 층 정보입니다. 맞는지 확인하고 다르면 수정해주세요.",
    sectionKey: "current_business",
  },
  primary_activity: {
    label:
      "미리 확인한 업종·주된 영업 내용입니다. 맞는지 확인하고 다르면 수정해주세요.",
    sectionKey: "current_business",
  },
  official_phone: {
    label:
      "미리 확인한 대표 전화번호입니다. 맞는지 확인하고 다르면 수정해주세요.",
    sectionKey: "current_business",
  },
  official_website: {
    label:
      "미리 확인한 공식 웹사이트입니다. 맞는지 확인하고 다르면 수정해주세요.",
    sectionKey: "current_business",
  },
  overall_history: {
    label:
      "미리 확인한 과거 사건 흐름입니다. 맞는지 확인하고 다르면 수정해주세요.",
    sectionKey: "history_summary",
  },
};
