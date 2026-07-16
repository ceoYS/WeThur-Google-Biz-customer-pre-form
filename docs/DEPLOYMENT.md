# Deployment and release checklist

## Before push

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run format:check
git diff --check
git status
```

Review tracked files for `.env*`, keys, tokens, real customer answers, certificates, phone numbers, emails, and evidence. Only `.env.example` with fictional values may be committed.

## Database and application

1. Confirm the target Supabase project and current migration state.
2. Back up production according to the active recovery policy.
3. Apply new migrations in order.
4. Push the exact tested Git commit to the configured branch.
5. Deploy that commit to Vercel with all required environment variables.
6. Record the Git SHA, Vercel deployment URL, Supabase project ref, and migration list in the private release record.

## Production smoke test

- `/` and `/privacy` render over HTTPS.
- `/admin/login` sends a magic link only through Supabase.
- An allowlisted test administrator can log in; a non-allowlisted account cannot.
- A fictional case can be created with modules, prefilled fact, candidate, custom question, and evidence request.
- The generated token URL reveals no UUID and can save/resume a draft.
- A safe fixture image uploads; direct bucket access is not public.
- Final submission succeeds once and the second attempt is rejected.
- The admin sees the submission, timeline, comparison, hypotheses, missing information, and attachment via a short-lived URL.
- Follow-up creation/status update and case status update work.
- JSON, CSV, and print exports work without tokens or signed URLs.
- Optional integrations either deliver the minimal summary or record a non-blocking disabled/failed state.

## Rollback

Prefer forward fixes. Reverting only the Vercel commit is safe only when the prior code remains compatible with the applied schema. Never use destructive database reset commands against production. Restore from backup only under the documented incident process.

## Current credential limitation

If Supabase authentication or project configuration is unavailable, stop after code, migration, build, and documentation verification. Do not fabricate a deployment, create fake production credentials, or publish a partially functional application.
