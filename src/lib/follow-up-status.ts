export const followUpStatusLabels = {
  draft: "작성 중",
  sent: "고객 회신 대기",
  responded: "고객 회신 도착",
  resolved: "해결됨",
  cancelled: "취소됨",
} as const;

export type FollowUpStatus = keyof typeof followUpStatusLabels;

const transitions: Record<FollowUpStatus, ReadonlySet<FollowUpStatus>> = {
  draft: new Set(["sent", "cancelled"]),
  sent: new Set(["responded", "resolved", "cancelled"]),
  responded: new Set(["sent", "resolved", "cancelled"]),
  resolved: new Set(["sent"]),
  cancelled: new Set(["draft"]),
};

export function canTransitionFollowUpStatus(
  from: FollowUpStatus,
  to: FollowUpStatus,
) {
  return from === to || transitions[from].has(to);
}

export function getAllowedFollowUpStatuses(
  from: FollowUpStatus,
): FollowUpStatus[] {
  return [from, ...transitions[from]];
}
