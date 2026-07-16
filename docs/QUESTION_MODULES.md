# Question modules

Question definitions live in `question_modules.schema_json` and are seeded by `202607160004_question_module_catalog.sql`. UI rendering is generic; adding or editing a module does not require a new customer deployment.

## Composition order

1. Common questions
2. Selected industry module
3. Selected issue modules in administrator order
4. Case-specific custom questions
5. Prefilled fact confirmation questions

Duplicate `question_key` values are merged deterministically, with case-specific configuration taking precedence where supported. Conditional rules are evaluated against current answers before a question is shown or treated as required.

## Module types

- Common: identity, location, contact, authority, history overview, evidence, goals, and final confirmation.
- Industry: restaurant, accommodation, nightlife/entertainment, office/service, medical, construction/industrial, and multi-location.
- Issue: new registration, suspension, disappearance, duplicate candidates, third-party ownership, ownership request, appeal, floors, brands, address/pin, names, phones/sites, categories, verification, rebrand, move, and multiple managers.
- Case-specific: administrator-authored text, textarea, single/multi select, boolean, period, number, and confirmation questions.

## Authoring rules

- Use neutral Korean and one concept per question.
- Add unknown/not-applicable choices whenever the customer may not know.
- Put detailed fields behind a simple preceding condition.
- Never add password, OTP, recovery-code, resident number, payment, or unmasked-ID fields.
- Store machine keys in lowercase snake case.
- Keep schema changes backward compatible or introduce an explicit schema/engine version.

Unit coverage for module composition and conditional logic is in `tests/unit/question-modules.test.ts`.
