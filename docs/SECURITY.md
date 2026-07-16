# Security

## Access model

### Customer intake

- Customer links contain 32 random bytes encoded as URL-safe base64.
- Only an HMAC-SHA256 digest is stored in `cases.token_hash`; the raw token cannot be recovered from the database.
- A token is valid only while `token_status = active`.
- The customer does not receive a database session and cannot query Supabase tables or storage directly.
- Route handlers validate the token, request origin, honeypot, rate limit, body schema, case state, and operation-specific rules.
- Intake and administrator responses set `X-Robots-Tag: noindex, nofollow, noarchive`.

The token is a bearer secret. Administrators should send it only to the intended customer and regenerate it if it may have been exposed.

### Administrator

- Supabase magic-link authentication proves email control; there is no shared password.
- A successful Auth session is not sufficient. The normalized email must also appear in server-only `ADMIN_EMAILS`.
- The callback provisions `admin_profiles` only after that allowlist check.
- RLS policies require membership in `admin_profiles` for every exposed operational table and private storage object.
- Server actions and route handlers repeat authorization checks rather than relying only on navigation protection.

## Secret separation

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are browser-safe identifiers.
- `SUPABASE_SERVICE_ROLE_KEY`, `TOKEN_HASH_SECRET`, integration secrets, and `ADMIN_EMAILS` are imported only by server modules.
- The service-role client disables browser session behavior and is never serialized into client components.
- Real environment values are excluded from Git; `.env.example` contains placeholders only.

Rotate `SUPABASE_SERVICE_ROLE_KEY` and `TOKEN_HASH_SECRET` if they are exposed. Rotating the token hash secret invalidates existing intake links, so administrators must regenerate them.

## Request controls

- Customer mutation endpoints require a matching `Origin` and same-site fetch metadata.
- Next.js server actions use the framework's origin protections and still validate authorization and input.
- `consume_rate_limit` atomically counts HMAC-scoped requests in Postgres. Raw IP addresses and raw customer tokens are not stored.
- Mutation payloads include an invisible honeypot; a populated value is rejected without explaining the signal.
- Zod schemas reject unknown or oversized structures before writes.
- Submitted cases use an atomic database transition and cannot be submitted twice unless an administrator reopens them.

## Browser controls

- A per-request nonce Content Security Policy restricts scripts to trusted Next.js output. Development alone permits `unsafe-eval` for tooling.
- `frame-ancestors 'none'`, `X-Frame-Options: DENY`, MIME sniffing protection, restrictive referrer and permissions policies, and production HSTS are enabled.
- Admin and intake routes are excluded from indexing.

Inline styles remain permitted because Next.js and Tailwind may emit them. Application code must not interpolate untrusted values into style content.

## Evidence controls

- Bucket `case-evidence` is private and denies anonymous access.
- Object names are random and follow `cases/<case-id>/<random-id>-<sanitized-filename>`.
- The application validates extension, declared MIME, magic bytes, size, filename, case state, and the fifteen-file limit.
- Administrators receive short-lived signed URLs on demand; signed URLs are never persisted or sent to optional integrations.
- Customer deletion is allowed only before final submission. Administrator deletion is audited.

Allowed files are JPEG, PNG, WebP, and PDF, up to 15 MB each. Customers are reminded to mask unrelated sensitive data.

## Logging and errors

- Do not log request bodies, customer answers, raw intake tokens, service errors containing data, signed URLs, or attachment contents.
- Activity records contain action names and minimal metadata, not secrets.
- Public errors are generic; detailed provider errors remain server-side and must be redacted.
- Notification payloads contain only case code, business name, submission time, and admin URL.

## Operational checks

Before deployment:

1. Verify every migration is applied in order.
2. Verify the bucket is private and anonymous reads fail.
3. Confirm every production admin address is intentionally listed in `ADMIN_EMAILS`.
4. Use a unique 32+ character `TOKEN_HASH_SECRET` from a cryptographic generator.
5. Confirm Vercel preview and production environment scopes are correct.
6. Run lint, typecheck, unit/integration tests, build, Playwright, dependency audit, and `git diff --check`.
7. Review tracked files for credentials and real customer data.

## Incident response

If an intake link is exposed, revoke or regenerate only that case token. If an administrator email is compromised, remove it from `ADMIN_EMAILS`, disable the Supabase Auth user, revoke active sessions, and review `case_activity_log`. If evidence access is suspected, rotate relevant credentials and review Supabase storage logs before reissuing access.
