import { describe, expect, it } from "vitest";

import { resolveIntakeProfileCandidates } from "@/lib/intake-profile-candidates";

type Candidate = {
  existingId?: string;
  clientId: string;
  displayedName: string;
  control: string;
};

describe("intake profile candidate restoration", () => {
  it("merges editable configuration with a pre-submission draft", () => {
    const configured: Candidate[] = [
      {
        existingId: "configured-1",
        clientId: "fresh-client-id",
        displayedName: "관리자 후보",
        control: "",
      },
    ];
    const draft: Candidate[] = [
      {
        existingId: "configured-1",
        clientId: "stable-client-id",
        displayedName: "고객이 확인한 후보",
        control: "yes",
      },
      {
        clientId: "customer-added",
        displayedName: "고객 추가 후보",
        control: "unknown",
      },
    ];

    expect(
      resolveIntakeProfileCandidates({
        intakeStatus: "draft",
        configured,
        draft,
      }),
    ).toEqual(draft);
  });

  it("uses the saved customer payload unchanged after a case is reopened", () => {
    const configuredAfterSubmission: Candidate[] = [
      {
        existingId: "normalized-new-id-1",
        clientId: "generated-client-id-1",
        displayedName: "정규화된 후보 1",
        control: "",
      },
      {
        existingId: "normalized-new-id-2",
        clientId: "generated-client-id-2",
        displayedName: "정규화된 후보 2",
        control: "",
      },
    ];
    const submittedDraft: Candidate[] = [
      {
        existingId: "prefill-id-before-submission",
        clientId: "original-client-id-1",
        displayedName: "고객 확인 후보 1",
        control: "yes",
      },
      {
        clientId: "original-client-id-2",
        displayedName: "고객 추가 후보 2",
        control: "unknown",
      },
    ];

    const restored = resolveIntakeProfileCandidates({
      intakeStatus: "reopened",
      configured: configuredAfterSubmission,
      draft: submittedDraft,
    });

    expect(restored).toEqual(submittedDraft);
    expect(restored).toHaveLength(2);
  });
});
