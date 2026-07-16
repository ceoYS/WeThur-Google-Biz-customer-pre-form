import { describe, expect, it } from "vitest";

import {
  canTransitionFollowUpStatus,
  getAllowedFollowUpStatuses,
} from "@/lib/follow-up-status";
import { updateFollowUpSchema } from "@/lib/schemas/admin-workspace";

describe("follow-up request status", () => {
  it("supports sent, responded, resolved, and reopening flows", () => {
    expect(canTransitionFollowUpStatus("draft", "sent")).toBe(true);
    expect(canTransitionFollowUpStatus("sent", "responded")).toBe(true);
    expect(canTransitionFollowUpStatus("responded", "resolved")).toBe(true);
    expect(canTransitionFollowUpStatus("resolved", "sent")).toBe(true);
    expect(getAllowedFollowUpStatuses("draft")).not.toContain("resolved");
  });

  it("requires a customer response for responded status", () => {
    expect(
      updateFollowUpSchema.safeParse({
        status: "responded",
        customerResponse: "",
      }).success,
    ).toBe(false);
    expect(
      updateFollowUpSchema.safeParse({
        status: "responded",
        customerResponse: "고객이 계정 접근 가능 여부를 회신함",
      }).success,
    ).toBe(true);
  });
});
