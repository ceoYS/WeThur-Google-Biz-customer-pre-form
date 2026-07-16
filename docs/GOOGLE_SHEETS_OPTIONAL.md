# Optional Google Sheets summary mirror

Supabase is authoritative. The mirror is disabled by default and receives only case code, business name, submitted time, and administrator case URL. It never receives answers, attachments, customer tokens, Storage paths, or signed URLs.

## Apps Script setup

1. Create or choose the private spreadsheet intended for the operational summary.
2. Open Extensions -> Apps Script.
3. Add `scripts/google-sheets/Code.gs`.
4. In Project Settings -> Script properties, set `WEBHOOK_SECRET` to a high-entropy value.
5. Deploy as a Web app with execution under the owner account and access limited as tightly as the chosen Apps Script configuration permits.
6. Copy the deployment URL into `GOOGLE_SHEETS_WEBHOOK_URL` and set the same secret as `GOOGLE_SHEETS_WEBHOOK_SECRET` in Vercel.
7. Submit a fictional test case and verify one row in `WeThru Cases`.

The request body contains a sanitized `payload` and HMAC-SHA256 `signature`. Apps Script verifies the signature before writing and protects spreadsheet formula prefixes.

## Failure behavior

Timeouts, HTTP errors, signature errors, and spreadsheet errors do not roll back customer submission. The application writes a non-sensitive status to `outbound_delivery_log`. Disable the integration by clearing both environment values; submission and admin review continue normally.

Do not add extra fields to `Code.gs` without updating the allowlist and conducting a privacy review.
