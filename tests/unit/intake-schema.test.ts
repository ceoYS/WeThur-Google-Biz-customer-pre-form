import { describe, expect, it } from "vitest";

import {
  createEmptyHistoryEvent,
  createEmptyProfileCandidate,
  createEmptyThirdParty,
  intakePayloadSchema,
} from "@/lib/schemas/intake";

describe("customer intake payload", () => {
  it("accepts structured repeatable history, profiles, and third parties", () => {
    const payload = {
      schemaVersion: 1,
      answers: { authority_status: "맞아요", priority_goals: ["원인 이해"] },
      historyEvents: [createEmptyHistoryEvent()],
      profileCandidates: [createEmptyProfileCandidate()],
      thirdParties: [createEmptyThirdParty()],
      website: "",
    };
    expect(intakePayloadSchema.safeParse(payload).success).toBe(true);
  });

  it("limits repeatable groups to ten items", () => {
    const result = intakePayloadSchema.safeParse({
      schemaVersion: 1,
      answers: {},
      historyEvents: Array.from({ length: 11 }, createEmptyHistoryEvent),
      profileCandidates: [],
      thirdParties: [],
      website: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects credential fields and malformed optional account emails", () => {
    const credential = intakePayloadSchema.safeParse({
      schemaVersion: 1,
      answers: { google_password: "must never be collected" },
      historyEvents: [],
      profileCandidates: [],
      thirdParties: [],
      website: "",
    });
    const event = createEmptyHistoryEvent();
    event.accountEmail = "not-an-email";
    const malformedEmail = intakePayloadSchema.safeParse({
      schemaVersion: 1,
      answers: {},
      historyEvents: [event],
      profileCandidates: [],
      thirdParties: [],
      website: "",
    });
    expect(credential.success).toBe(false);
    expect(malformedEmail.success).toBe(false);
  });
});
