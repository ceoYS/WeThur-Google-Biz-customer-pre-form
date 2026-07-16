export const caseStatusLabels = {
  link_ready: "링크 준비",
  customer_writing: "고객 작성 중",
  new_submission: "신규 접수",
  initial_review: "1차 검토 중",
  additional_info_requested: "추가 자료 요청",
  awaiting_customer: "고객 회신 대기",
  hypothesis_review: "원인 가설 정리",
  route_decided: "공식 경로 결정",
  in_progress: "진행 중",
  completed: "완료",
  on_hold: "보류",
  stopped: "진행 중단",
} as const;

export type CaseStatus = keyof typeof caseStatusLabels;

export const intakeStatusLabels = {
  link_ready: "링크 준비",
  draft: "고객 작성 중",
  submitted: "제출 완료",
  reopened: "다시 작성 중",
} as const;

export type IntakeStatus = keyof typeof intakeStatusLabels;

const statusTransitions: Record<CaseStatus, ReadonlySet<CaseStatus>> = {
  link_ready: new Set(["customer_writing", "on_hold", "stopped"]),
  customer_writing: new Set(["new_submission", "on_hold", "stopped"]),
  new_submission: new Set([
    "initial_review",
    "additional_info_requested",
    "on_hold",
    "stopped",
  ]),
  initial_review: new Set([
    "additional_info_requested",
    "hypothesis_review",
    "route_decided",
    "on_hold",
    "stopped",
  ]),
  additional_info_requested: new Set([
    "awaiting_customer",
    "initial_review",
    "on_hold",
    "stopped",
  ]),
  awaiting_customer: new Set([
    "initial_review",
    "additional_info_requested",
    "on_hold",
    "stopped",
  ]),
  hypothesis_review: new Set([
    "additional_info_requested",
    "route_decided",
    "on_hold",
    "stopped",
  ]),
  route_decided: new Set(["in_progress", "on_hold", "stopped"]),
  in_progress: new Set([
    "additional_info_requested",
    "completed",
    "on_hold",
    "stopped",
  ]),
  completed: new Set(["in_progress", "on_hold"]),
  on_hold: new Set([
    "initial_review",
    "hypothesis_review",
    "route_decided",
    "in_progress",
    "stopped",
  ]),
  stopped: new Set(["on_hold", "initial_review"]),
};

export function canTransitionCaseStatus(
  from: CaseStatus,
  to: CaseStatus,
): boolean {
  return from === to || statusTransitions[from].has(to);
}

export function getAllowedCaseStatuses(from: CaseStatus): CaseStatus[] {
  return [from, ...statusTransitions[from]];
}
