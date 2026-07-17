type ProfileCandidateIdentity = {
  existingId?: string;
};

export function resolveIntakeProfileCandidates<
  Candidate extends ProfileCandidateIdentity,
>(options: {
  intakeStatus: "link_ready" | "draft" | "submitted" | "reopened";
  configured: Candidate[];
  draft: Candidate[] | null;
}): Candidate[] {
  const { intakeStatus, configured, draft } = options;
  if (!draft) return configured;

  // Configuration is locked after submission, so the saved customer payload is
  // authoritative when a completed case is viewed or reopened.
  if (intakeStatus === "submitted" || intakeStatus === "reopened") return draft;

  return [
    ...configured.map((candidate) => {
      const customerDraft = draft.find(
        (draftCandidate) => draftCandidate.existingId === candidate.existingId,
      );
      return customerDraft ?? candidate;
    }),
    ...draft.filter((candidate) => !candidate.existingId),
  ];
}
