# Supabase setup

## Project

Create one production Supabase project for the common WeThru platform. Do not create a project per customer. Use a separate Supabase project for local/integration testing when possible.

Collect these values without printing or committing them:

- Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
- Publishable key -> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Service-role key -> `SUPABASE_SERVICE_ROLE_KEY`

The service-role key is server-only and must never use the `NEXT_PUBLIC_` prefix.

## Migrations

Apply every file in `supabase/migrations` in lexical order. Preferred CLI flow:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

If the CLI is unavailable, use the Supabase Dashboard SQL Editor and apply each file once in order. Keep a private deployment record of project ref, migration filenames, time, operator, and application Git SHA. Do not edit a migration already applied to production; add a new numbered migration.

The migrations create tables, constraints, indexes, updated-at triggers, item limits, atomic case/intake functions, RLS, the private `case-evidence` bucket, module seeds, and timeline operations.

## Auth

1. Enable email magic-link authentication.
2. Set Site URL to the deployed `APP_URL`.
3. Add local, Preview, and Production `<origin>/auth/callback` redirect URLs as appropriate.
4. Configure `ADMIN_EMAILS` as a comma-separated allowlist.
5. Request a magic link from `/admin/login`. The callback creates `admin_profiles` only for an allowlisted authenticated email.

An authenticated Supabase user who is not in both `ADMIN_EMAILS` and `admin_profiles` has no administrator access.

## Storage verification

Confirm that `case-evidence` exists and is private. Do not enable public access. Upload through the intake handler, then verify that the raw object URL fails and the administrator signed URL expires after approximately 60 seconds.

## Backup

Enable the Supabase backup/PITR level appropriate to production. Database backups do not automatically prove Storage recovery; document and test both. Restore only into an isolated project first, validate RLS and bucket privacy, then plan production cutover.
