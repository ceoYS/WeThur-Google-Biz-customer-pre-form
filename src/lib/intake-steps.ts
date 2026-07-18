export const intakeStepDefinitions = [
  {
    id: "current_business",
    title: "사업장과 운영 실체",
    description:
      "미리 확인한 정보가 맞는지 살펴보고, 실제 간판·출입구·운영 정보를 확인합니다.",
  },
  {
    id: "history_summary",
    title: "과거 Google 등록·정지·이의신청 이력",
    description:
      "정확한 날짜가 아니어도 괜찮습니다. 계정, 인증, 정지와 공식 절차의 흐름을 정리합니다.",
  },
  {
    id: "changes",
    title: "정지·삭제 전후 변경 및 참여자",
    description:
      "결과 전후에 바뀐 정보와 당시 작업에 참여한 사람·업체를 구분합니다.",
  },
  {
    id: "profile_candidates",
    title: "현재 지도 프로필 후보 비교",
    description:
      "미리 찾은 후보의 표시 정보와 관리·소유권 요청 가능 여부를 확인합니다.",
  },
  {
    id: "evidence",
    title: "증빙자료",
    description:
      "공식 문서와 현장·Google 화면 중 지금 확인 가능한 자료만 안전하게 제출합니다.",
  },
  {
    id: "confirmation",
    title: "마지막 확인",
    description: "답변 기준, 계정 보안, 진단 범위를 확인한 뒤 제출합니다.",
  },
] as const;

export type IntakeStepId = (typeof intakeStepDefinitions)[number]["id"];

export const intakeStepIds = intakeStepDefinitions.map((step) => step.id) as [
  IntakeStepId,
  ...IntakeStepId[],
];
