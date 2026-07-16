# Privacy and retention

## Data collected

The platform collects business identity and location facts, customer authority and contact preferences, historical Google profile events, visible profile candidates, third-party involvement, customer goals, administrator notes, and files deliberately uploaded as evidence.

It must not collect Google passwords, OTPs, recovery codes, resident-registration numbers, full payment data, unmasked identity cards, or full personal financial records. Intake schemas reject credential-like answer keys and every upload screen repeats the masking reminder.

## Purpose and access

Data is used to compare the real business, past registration flow, current map state, control status, evidence gaps, and possible official next routes. It is not used to promise approval or ranking.

Only allowlisted WeThru administrators with a valid Supabase Auth session may access case data. Customers use an opaque case-specific bearer link and cannot query Supabase, list cases, access another case, or open administrator pages.

## File protection

Evidence is stored in the private `case-evidence` bucket. The database stores a private object path, while administrators receive a short-lived signed URL only when opening one file. Public object URLs are not used, and signed URLs are not persisted in application logs or exports.

## Retention

- Retain active-case data while consulting work is in progress.
- Set and review `retention_review_at` after completion.
- Do not enable automatic production deletion without an explicit, tested policy.
- Permit authorized administrators to delete attachments when no longer needed.
- Process deletion requests using the case code and verified request channel.
- Treat every additional business location as a separate case.

Deletion must account for database rows, private Storage objects, optional delivery mirrors, backups, and any legally required hold. Record the operational action without placing deleted content in the audit log.

## Customer notice

The plain-language public notice is available at `/privacy`. WeThru should review it with applicable contracts and law before production launch and update both the page and this document when the operational policy changes.
