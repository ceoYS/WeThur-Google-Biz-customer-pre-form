# Data Model and Ownership

## Design principles

1. Every operational record belongs to a UUID case; public URLs never reveal that UUID.
2. The original customer payload is retained separately from administrator-normalized fields.
3. Facts carry provenance and verification status instead of being silently overwritten.
4. Attachments are metadata rows pointing to private storage objects, never public URLs.
5. Deleting a case intentionally cascades its case-owned records. Removing a history event or candidate keeps its evidence row and clears only that optional association.
6. Evolving question definitions and diagnosis rules are versioned outside UI rendering code.

## Core case configuration

- `cases`: customer-facing setup, opaque case code, hashed token state, workflow status, assignment, and retention timestamps.
- `question_modules`: reusable common, industry, and issue question schemas.
- `case_modules`: selected modules and per-case configuration.
- `case_prefilled_fields`: facts known before intake, including provenance and editability.
- `case_custom_questions`: administrator-authored questions and conditional logic.
- `case_requested_evidence`: per-case evidence checklist.

## Customer response

- `case_intake_responses`: versioned raw draft and final payload. This is the immutable source-shaped record used to reconstruct what the customer sent.
- `case_current_business`: normalized actual business identity and physical operation.
- `case_history_summary`: counts, account access, and appeal overview.
- `history_events`: ordered repeatable past profile and registration events, limited to ten per case.
- `current_profile_candidates`: ordered profiles requiring comparison, limited to ten per case.
- `third_party_history`: agencies, employees, booking managers, marketers, or webmasters involved.
- `customer_goals`: prioritized outcomes and success definition.

## Evidence

- `case_evidence`: validated private-object metadata. File count is limited to fifteen per case and file size to 15 MB.
- Storage bucket: `case-evidence`.
- Object path: `cases/<case-uuid>/<random-id>-<sanitized-filename>`.

The database validates permitted MIME declarations and limits. The application additionally validates file signatures before upload because a client-provided content type is not trusted.

## Consulting workspace

- `case_fact_items`: atomic facts with source and one of `confirmed`, `customer_statement`, `inference`, `unknown`, or `conflicting`.
- `case_diagnosis`: versioned engine output plus the administrator's conclusion and final decision path.
- `follow_up_requests`: understandable customer questions and response state.
- `admin_notes`: internal notes.
- `case_activity_log`: append-oriented audit events.
- `outbound_delivery_log`: minimal operational status for optional email and Sheets delivery.

## Security support

- `admin_profiles`: allowlisted Supabase Auth users. RLS checks this table rather than trusting any authenticated account.
- `endpoint_rate_limits`: server-only hashed request scopes and expiring windows.
- `cases.token_hash`: lowercase HMAC-SHA256 digest only; raw intake tokens are never persisted.

Anonymous database privileges are revoked. Authenticated policies require `is_admin()`. Customer access is mediated by server handlers with the service role after token validation.

## Key constraints

- Case codes are non-sequential and match `WTH-<8+ random uppercase characters>`.
- History events and current profile candidates allow at most ten records each.
- Evidence allows at most fifteen files, each no larger than 15 MB.
- Submitted intake rows require `submitted_at`.
- Diagnosis scores are bounded from 0 to 100 and final paths are limited to A through H.
- JSON columns enforce their expected object or array shape.

## Migration order

1. `202607160001_core_schema.sql`: extensions, tables, indexes, triggers, limits, and comments.
2. `202607160002_rls_and_storage.sql`: admin membership, RLS, privileges, and private bucket.
3. `202607160003_rate_limiting.sql`: atomic server-side endpoint rate limiting.
4. `202607160004_question_module_catalog.sql`: reusable common, industry, and issue module catalog.
5. `202607160005_atomic_case_creation.sql`: atomic case, module, prefill, candidate, custom-question, and evidence setup.
6. `202607160006_admin_directory_policy.sql`: allowlisted administrator directory read policy.
7. `202607160007_transactional_intake.sql`: draft and final intake normalization transactions.
8. `202607160008_update_case_configuration.sql`: safe pre-submission configuration replacement.
9. `202607160009_timeline_admin_workspace.sql`: administrator normalization note and atomic history ordering.
10. `202607160010_third_party_changes_array.sql`: aligns third-party change history with the validated array payload.
11. `202607170011_customer_evidence_mutations.sql`: serializes customer evidence registration and deletion against final submission.

Never rewrite an applied production migration. Add a new migration and preserve compatibility with the deployed application release sequence.
