# Vercel setup

## Project connection

Create one Vercel project connected to:

`https://github.com/ceoYS/WeThur-Google-Biz-customer-pre-form`

Do not rename the repository. Framework detection should select Next.js and the package manager should remain npm.

## Environment

Set the following for the intended environments without exposing values in CLI transcripts:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAILS`
- `APP_URL`
- `TOKEN_HASH_SECRET`

Optional integrations:

- `EMAIL_PROVIDER_API_KEY`
- `SUBMISSION_NOTIFICATION_EMAIL`
- `EMAIL_FROM`
- `GOOGLE_SHEETS_WEBHOOK_URL`
- `GOOGLE_SHEETS_WEBHOOK_SECRET`

Use different Supabase projects and secrets for Preview and Production when previews may process data. `TOKEN_HASH_SECRET` must be at least 32 high-entropy characters. Changing it invalidates all existing intake links.

## Release order

1. Run local checks.
2. Push the reviewed commit.
3. Apply compatible database migrations to the target Supabase project.
4. Deploy the matching application commit.
5. Update Supabase Auth Site URL and redirect allowlist if the domain changed.
6. Run the production smoke checklist from `DEPLOYMENT.md`.

Never deploy a production UI that depends on unapplied migrations. Roll forward with a corrective migration and commit rather than editing production state manually without a record.
