# Diagnosis rules

The diagnosis engine is a deterministic consulting aid. It does not model or claim knowledge of Google's private enforcement systems, and it never makes the administrator's final A-H route decision.

## Versioning

- Implementation: `src/lib/diagnosis-engine.ts`
- Current version: `1.0.0`
- Stored version: `case_diagnosis.engine_version`
- Inputs: validated final intake payload and submitted evidence categories
- Output: scores, ordered hypotheses, supporting and contradicting facts, unknowns, evidence needs, safe actions, and non-conclusions

Change the version whenever a rule threshold, score weight, interpretation, or output contract changes. Existing saved diagnosis rows retain the version used to create them.

## Confidence levels

| Score  | Customer-facing label |
| ------ | --------------------- |
| 0-29   | 단서 적음             |
| 30-59  | 가능성 있음           |
| 60-100 | 우선 확인 필요        |

Scores order review work. They are not probabilities and must not be presented as Google decisions.

## Categories

1. `duplicate_entity_fragmentation`: counts profile candidates, names, addresses, floors, phones, and creation attempts.
2. `business_name_inconsistency`: compares sign, registration, permit, desired standard, historical, and current names.
3. `address_floor_pin_inconsistency`: compares address and floor variants and map-pin notes.
4. `phone_website_inconsistency`: compares all submitted phone and website values.
5. `category_inconsistency`: compares actual primary activity with historical and visible categories.
6. `ownership_control_uncertainty`: checks profile control answers and third-party involvement.
7. `account_appeal_conflict`: checks old-account access, appeal status, and recreation during an appeal.
8. `insufficient_physical_evidence`: checks exterior, permanent-sign, entrance, and operating-permit evidence categories.
9. `repeated_recreation_pattern`: checks creation attempts, suspensions or disappearances, and timeline size.
10. `independent_business_ambiguity`: checks floor structure and independent-business signals.
11. `verification_process_mismatch`: checks failed verification results and changes in verification method.
12. `rebranding_moved_location_confusion`: checks rebrand or move timelines and name/address variants.
13. `third_party_management_conflict`: checks the number and access level of agencies, employees, or managers.

## Operational safeguards

- The same validated input always returns the same result.
- Every hypothesis states what must not yet be concluded.
- Suggested paths have `requiresAdminDecision: true` and are not final decisions.
- Regeneration reads only the stored final payload; normalized administrator edits do not overwrite the customer's original response.
- If automatic diagnosis fails after submission, submission remains successful and only a non-sensitive activity event is recorded.
- Administrators should record the final route and conclusion after reviewing source facts, contradictions, and evidence.

## Missing-information engine

`src/lib/missing-information-engine.ts` version `1.0.0` converts validated intake data, submitted evidence categories, and high-priority hypothesis unknowns into an ordered checklist. Account access, appeal state, and current profile control are checked before lower-priority document gaps. It also identifies conflicting names, phones, floors, and categories without classifying any profile as a violation.

Suggested questions use plain Korean, explicitly reject password or OTP collection, and are saved separately as administrator-controlled follow-up requests. The administrator may copy, mark sent, record a customer response, resolve, cancel, or reopen a request.

## Test coverage

`tests/unit/diagnosis-engine.test.ts` verifies all 13 categories, versioning, required transparency fields, determinism, administrator-only path decisions, and evidence-sensitive scoring. `tests/unit/missing-information-engine.test.ts` verifies confirmation order, friendly question generation, determinism, and evidence checklist reduction.
