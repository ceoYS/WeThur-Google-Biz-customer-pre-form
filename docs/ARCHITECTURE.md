# Platform Architecture

## System boundary

WeThru Google Business Profile Diagnosis is one multi-customer application. Customer-specific behavior is data, not deployment configuration:

```text
Common platform
  + common questions
  + one industry module
  + selected issue modules
  + case-specific questions
  + administrator-prefilled facts
  = one customer-specific intake experience
```

One GitHub repository, Vercel project, Supabase project, administrator area, and form engine support every case. A case receives an opaque, cryptographically random intake token. The database stores only its HMAC-SHA256 digest.

## Runtime flow

```text
Customer browser
  -> Next.js route handler (token, origin, honeypot, rate, and Zod checks)
  -> Supabase service client (server-only)
  -> Postgres and private case-evidence bucket

Administrator browser
  -> Supabase magic-link session
  -> Next.js server component/action (ADMIN_EMAILS check)
  -> Supabase user-scoped client
  -> RLS policy backed by admin_profiles
```

Customers never receive database credentials beyond the normal public Supabase publishable key used by the administrator authentication client. Customer intake pages do not query Supabase directly. All customer mutations pass through same-origin Next.js handlers and server-side token validation.

## Application layers

- `src/app`: App Router pages, layouts, route handlers, and server actions.
- `src/components`: accessible customer and administrator interface components.
- `src/lib`: validation, token security, Supabase clients, authorization, modules, diagnosis, missing-information, exports, and delivery adapters.
- `supabase/migrations`: versioned schema, constraints, RLS, private storage, and deterministic transactional functions.
- `tests`: unit and integration tests for domain and server boundaries.
- `e2e`: Playwright workflows against a local or configured Supabase environment.

## Trust model

### Public customer

The intake token is a bearer secret. It is high entropy, transmitted only in the URL path, stored as a digest, redacted from application logs, and revocable. Possession grants access only to a safe case projection and draft/final mutation endpoints for that case. Submitted cases are read-only until an administrator reopens them.

### Administrator

Supabase Auth proves control of an email address. The callback then checks the normalized email against `ADMIN_EMAILS`. Only approved identities are provisioned into `admin_profiles`; database RLS uses that membership for every case table and private storage object.

### Server

The service-role key is imported only from server-only modules. It is used for token-scoped customer operations, evidence writes, notification delivery metadata, and administrator provisioning. It is never serialized to React props or browser bundles.

## Availability and optional integrations

Customer submission is committed to Supabase before optional email or Google Sheets delivery runs. Optional delivery failures are recorded without changing submission success. Supabase remains authoritative.

## Diagnosis boundary

The diagnosis engine is deterministic, versioned, and pure. It accepts normalized case facts and returns scored hypotheses, missing facts, evidence needs, and safe next actions. Scores organize review; they never select the final path or represent Google's private enforcement logic.

## Deployment topology

- Vercel hosts the Next.js application.
- Supabase hosts Postgres, Auth, and the private `case-evidence` bucket.
- GitHub hosts source and migration history.
- Optional email and Sheets endpoints receive only the minimum documented summary.

No per-customer environment, repository, database, or deployment is required.
