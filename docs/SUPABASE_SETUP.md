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

The migrations create tables, constraints, indexes, updated-at triggers, item limits, atomic case/intake and customer-evidence functions, RLS, the private `case-evidence` bucket, module seeds, and timeline operations.

## Auth

1. Enable email magic-link authentication.
2. For local development, set both Site URL and `APP_URL` to
   `http://localhost:3000`, and add
   `http://localhost:3000/auth/callback` to Redirect URLs.
3. In Authentication -> Emails -> Templates -> Magic link or OTP, replace the
   `{{ .ConfirmationURL }}` template. Set the subject to
   `WeThru 관리자 로그인` and use this body:

   ```html
   <h2>WeThru 관리자 로그인</h2>

   <p>아래 버튼을 눌러 관리자 화면에 로그인해주세요.</p>

   <p>
     <a
       href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/admin"
     >
       관리자 로그인
     </a>
   </p>

   <p>이 링크는 한 번만 사용할 수 있으며 잠시 후 만료됩니다.</p>
   ```

4. Before deploying to Vercel, change `APP_URL` and Site URL to the Production
   origin, add `<production-origin>/auth/callback`, and add any required Preview
   callback origins to the Redirect URLs allowlist.
5. Configure `ADMIN_EMAILS` as a comma-separated allowlist.
6. Request a magic link from `/admin/login`. `/auth/confirm` verifies the token
   hash and creates `admin_profiles` only for an allowlisted authenticated email.

An authenticated Supabase user who is not in both `ADMIN_EMAILS` and `admin_profiles` has no administrator access.

`/auth/confirm` is the Magic Link endpoint. It verifies `token_hash` with
`type=email`, stores the returned session in cookies, checks `ADMIN_EMAILS`, and
upserts `admin_profiles`. `/auth/callback` remains separate for ConfirmationURL
emails already in flight and PKCE authorization-code callbacks. There is no
current OAuth sign-in call in this codebase, so the callback is retained as a
compatibility route rather than deleted speculatively.

Do not repeatedly request Magic Links during setup. The form disables its input
and button while a request is pending, while Supabase Auth remains the authority
for per-user and project-wide rate limits. The UI maps rate-limit failures to a
safe retry-later message without exposing the email address, token, or provider
error details.

## Custom SMTP

Authentication -> Email -> Custom SMTP is enabled with this non-secret
configuration:

- Sending domain: `auth.nitual.com` (Verified in Resend)
- Sender email: `login@auth.nitual.com`
- Sender name: `WeThru`
- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`

Keep the SMTP password/API key only in the Supabase Dashboard secret field.
Never place it in this repository, `.env.local` output, logs, screenshots, or
support messages. Disable provider-side link tracking for Auth emails so it does
not rewrite the one-time TokenHash URL.

## Storage verification

Confirm that `case-evidence` exists and is private. Do not enable public access. Upload through the intake handler, then verify that the raw object URL fails and the administrator signed URL expires after approximately 60 seconds.

## Backup

Enable the Supabase backup/PITR level appropriate to production. Database backups do not automatically prove Storage recovery; document and test both. Restore only into an isolated project first, validate RLS and bucket privacy, then plan production cutover.
