import { describe, expect, it } from "vitest";

import {
  diagnosisDecisionSchema,
  factReviewSchema,
  historyEventAdminSchema,
  reorderHistorySchema,
} from "@/lib/schemas/admin-workspace";

describe("admin workspace schemas", () => {
  it("does not accept customer raw response replacement", () => {
    expect(
      historyEventAdminSchema.safeParse({ customer_raw_response: {} }).success,
    ).toBe(false);
  });

  it("requires a complete unique history order", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(reorderHistorySchema.safeParse({ eventIds: [id, id] }).success).toBe(
      false,
    );
  });

  it("restricts fact status and final decision path", () => {
    expect(
      factReviewSchema.safeParse({
        verificationStatus: "confirmed",
        adminNote: "문서로 확인",
      }).success,
    ).toBe(true);
    expect(
      diagnosisDecisionSchema.safeParse({
        adminDecisionPath: "Z",
        adminConclusion: "",
      }).success,
    ).toBe(false);
  });
});
