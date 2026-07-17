# WeThru Google Business Profile Diagnosis

WeThru 구글 비즈니스 프로필 사전 진단은 여러 고객의 Google Business Profile 접수, 증빙, 이력 비교, 원인 가설, 후속 질문, 공식 진행 경로를 하나의 운영 시스템에서 관리하는 Next.js 애플리케이션입니다.

Repository: `https://github.com/ceoYS/WeThur-Google-Biz-customer-pre-form`

저장소 이름의 `WeThur`는 유지합니다. 제품과 고객 화면에는 `WeThru`만 사용합니다.

## Architecture

```text
Administrator -> Supabase magic link -> case setup and secure token
Customer -> /intake/<opaque-token> -> validated Next.js handlers
Next.js server -> Supabase Postgres + private case-evidence Storage
Administrator -> timeline, profile matrix, hypotheses, follow-ups, exports
```

고객별 맞춤 경험은 별도 배포가 아니라 공통 질문 + 산업 모듈 + 이슈 모듈 + 사건별 질문 + 사전 입력 사실의 조합입니다. 원시 고객 응답은 관리자 정규화 값과 분리해 보존합니다.

## Stack

- Next.js App Router, React, strict TypeScript, Tailwind CSS
- React Hook Form and Zod
- Supabase Postgres, Auth, and private Storage
- Vitest, Playwright, ESLint, and Prettier
- Vercel

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local`에 실제 Supabase 개발 프로젝트 값을 설정합니다. 브라우저에는 publishable key만 노출되며 service-role key와 token hash secret은 서버 전용입니다. 환경 파일은 Git에 커밋하지 않습니다.

## Supabase setup

1. 새 Supabase 프로젝트를 만들고 Auth 이메일 로그인을 활성화합니다.
2. 로컬에서는 Site URL과 `APP_URL`을 `http://localhost:3000`으로 맞추고,
   redirect URL에 `http://localhost:3000/auth/callback`을 등록합니다.
3. Magic Link 템플릿을 `/auth/confirm` TokenHash 경로로 연결합니다. 기존
   code flow 호환을 위해 `<APP_URL>/auth/callback` redirect URL은 유지합니다.
4. Resend Custom SMTP는 Verified 발송 도메인 `auth.nitual.com`과 서버에
   저장한 SMTP 자격 증명을 사용합니다. 비밀번호나 API key는 문서와 Git에
   기록하지 않습니다.
5. `supabase/migrations`의 SQL을 파일명 순서대로 적용합니다.
6. 첫 관리자 이메일을 `ADMIN_EMAILS`에 넣습니다.
7. `/admin/login`에서 그 이메일로 magic link를 한 번 요청합니다. 허용된
   이메일만 `admin_profiles`에 생성되며, 반복 요청 시 Supabase Auth의
   rate limit이 적용됩니다.

CLI를 사용할 경우:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

Dashboard SQL Editor를 사용할 때도 모든 파일을 순서대로 한 번씩 적용하고 migration history를 별도로 기록합니다. 자세한 내용은 [Supabase setup](docs/SUPABASE_SETUP.md)을 따릅니다.

## Create and review a case

1. `/admin/cases/new`에서 사업장, 산업, 고객 안내문, 예상 시간, 모듈, 사전 사실, 프로필 후보, 사건별 질문, 요청 증빙을 입력합니다.
2. 생성 직후 한 번 표시되는 고객 URL을 안전한 채널로 전달합니다. DB에는 토큰의 HMAC digest만 저장됩니다.
3. 고객은 같은 링크로 임시 저장과 재개를 하고 최대 한 번 최종 제출합니다.
4. 관리자는 사건 요약, 타임라인, 프로필 비교, 가설, 부족 정보, 후속 질문, A-H 경로 결정을 검토합니다.
5. 필요하면 링크를 해지·재생성하거나 제출을 다시 엽니다.

[Case creation guide](docs/CASE_CREATION_GUIDE.md)와 [Admin workflow](docs/ADMIN_WORKFLOW.md)에 전체 순서가 있습니다.

## Diagnosis and evidence

진단 엔진은 13개 범주의 결정론적 가설을 생성합니다. 점수는 검토 순서이며 확률이나 Google의 내부 판단이 아닙니다. 최종 A-H 경로는 관리자만 결정합니다. 규칙과 버전 정책은 [Diagnosis rules](docs/DIAGNOSIS_RULES.md)에 있습니다.

증빙은 `case-evidence` 비공개 버킷에 저장됩니다. JPG, PNG, WebP, PDF만 허용하며 서버가 MIME과 파일 시그니처를 확인합니다. 파일당 15 MB, 사건당 초기 15개 제한이고 관리자 열람 URL은 60초만 유효합니다.

## Exports and optional delivery

관리자 사건 화면에서 전체 JSON, 사건 요약 CSV, 과거 이력 CSV, 프로필 비교 CSV, 첨부 목록 CSV, 인쇄용 브리프를 만들 수 있습니다. 내보내기에는 고객 토큰, Storage 경로, 서명 URL이 포함되지 않습니다.

선택적 제출 이메일은 Resend API를 사용하며 사건 코드, 사업장명, 제출 시각, 관리자 사건 URL만 보냅니다. `EMAIL_PROVIDER_API_KEY`, `SUBMISSION_NOTIFICATION_EMAIL`, `EMAIL_FROM`을 모두 설정해야 활성화됩니다.

Google Sheets mirror는 기본 비활성입니다. `GOOGLE_SHEETS_WEBHOOK_URL`과 `GOOGLE_SHEETS_WEBHOOK_SECRET`이 모두 있을 때만 같은 최소 요약을 전송합니다. Supabase가 항상 원본이며 외부 전달 실패는 제출을 막지 않습니다. [Optional Google Sheets](docs/GOOGLE_SHEETS_OPTIONAL.md)를 참고합니다.

## Privacy and retention

활성 사건 자료는 업무 진행 중 보관합니다. 완료 시 `retention_review_at`을 기준으로 보관 필요성을 검토하되 명시적 정책 없이 자동 삭제하지 않습니다. 관리자는 개별 첨부를 제거할 수 있고 고객은 사건 코드로 삭제를 요청할 수 있습니다. 다른 사업장은 별도 사건입니다. [Privacy](docs/PRIVACY.md)와 [Security](docs/SECURITY.md)를 참고합니다.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run format:check
git diff --check
```

Playwright 전체 흐름은 연결된 테스트 Supabase 환경과 안전한 테스트 관리자 로그인 구성이 있어야 실행됩니다.

## Vercel deployment

1. 이 GitHub 저장소를 Vercel 프로젝트에 연결합니다.
2. `.env.example`의 필수 값을 Preview와 Production에 각각 설정합니다.
3. Production Supabase에 migration을 먼저 적용합니다.
4. `APP_URL`, Supabase Site URL, `<origin>/auth/callback` redirect URL을 실제
   Vercel 운영 origin으로 변경하고 필요한 Preview origin도 redirect
   allowlist에 추가합니다.
5. Production 배포 후 홈페이지, magic link, 사건 생성, intake 저장·제출, 비공개 증빙, 내보내기를 검증합니다.

자세한 절차는 [Deployment](docs/DEPLOYMENT.md)와 [Vercel setup](docs/VERCEL_SETUP.md)에 있습니다.

## Backup and recovery

- Supabase의 프로젝트 백업/PITR 설정과 복원 절차를 운영 등급에 맞게 활성화합니다.
- Storage 객체와 DB metadata를 함께 백업해야 첨부를 복원할 수 있습니다.
- migration SQL과 애플리케이션 Git SHA를 배포 기록에 남깁니다.
- 복구 훈련은 별도 테스트 프로젝트에서 수행하고 production 데이터를 로컬 fixture로 복사하지 않습니다.
- 토큰 비밀이 노출되면 `TOKEN_HASH_SECRET`을 교체하는 것만으로 기존 링크가 모두 무효화되므로, 사건별 링크 재생성 계획을 함께 준비합니다.

## Troubleshooting

- `Required server configuration is unavailable`: 필수 서버 환경 값 또는 32자 이상의 `TOKEN_HASH_SECRET`을 확인합니다.
- Magic link 후 로그인 실패: `ADMIN_EMAILS`, Auth Site URL, Magic Link
  TokenHash 템플릿, 이메일 대소문자·공백을 확인합니다. `/auth/confirm`은
  Magic Link TokenHash를 검증하고, `/auth/callback`은 기존 PKCE code flow
  호환용입니다.
- 고객 링크 404: 링크가 해지됐거나 토큰 secret이 환경 간 다르거나 잘못된 Supabase 프로젝트를 사용 중인지 확인합니다.
- 업로드 실패: 확장자, 실제 파일 시그니처, 15 MB/15개 제한과 private bucket migration을 확인합니다.
- 진단 없음: 최종 제출 payload와 `case_diagnosis` 쓰기 결과, `diagnosis_generation_failed` 활동을 확인합니다.
- 외부 전달 실패: `outbound_delivery_log`의 비민감 오류 코드와 provider 설정을 확인합니다. 제출 원본은 Supabase에 남습니다.
