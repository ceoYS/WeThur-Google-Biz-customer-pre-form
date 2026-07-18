import {
  adminResponseGroupDefinitions,
  formatAdminAnswerValue,
  getAdminAnswerGroup,
  getAdminAnswerLabel,
  type AdminResponseGroup,
} from "@/lib/admin-response-format";
import type { CaseWorkspace } from "@/lib/case-workspace";

type ResponseRow = {
  key: string;
  label: string;
  value: unknown;
};

export function CustomerSubmissionView({
  workspace,
}: {
  workspace: CaseWorkspace;
}) {
  const questionLabels = Object.fromEntries(
    Object.entries(workspace.questionMetadata).map(([key, metadata]) => [
      key,
      metadata.label,
    ]),
  );
  const groupedRows = createGroupedRows(workspace, questionLabels);

  return (
    <div>
      <header className="mb-10">
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--navy-700)]">
          고객 제출 정보
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] sm:text-5xl">
          고객 답변 전체 보기
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--navy-700)]">
          고객이 제출한 원문은 유지하면서 내부 항목명과 상태값만 읽기 쉬운
          한국어로 표시합니다.
        </p>
      </header>

      <div className="space-y-14">
        {adminResponseGroupDefinitions.map(([group, title], index) => (
          <SubmissionGroup
            key={group}
            number={index + 1}
            group={group}
            title={title}
            rows={groupedRows[group]}
            workspace={workspace}
            questionLabels={questionLabels}
          />
        ))}
      </div>

      <details className="mt-16 border-y border-[var(--navy-300)] py-5">
        <summary className="cursor-pointer text-sm font-black">
          기술 정보 보기
        </summary>
        <p className="mt-4 text-xs leading-6 text-[var(--navy-700)]">
          내부 확인과 export 대조를 위한 읽기 전용 정보입니다. 기본 고객 답변
          화면에서는 사용하지 않습니다.
        </p>
        <dl className="mt-5 divide-y divide-[var(--navy-300)] border-y border-[var(--navy-300)]">
          {Object.entries(workspace.customerAnswers).map(([key, value]) => (
            <div
              key={key}
              className="grid gap-2 py-3 text-xs sm:grid-cols-[15rem_1fr]"
            >
              <dt className="font-mono font-bold">{key}</dt>
              <dd className="break-words whitespace-pre-wrap text-[var(--navy-700)]">
                {JSON.stringify(value)}
              </dd>
            </div>
          ))}
        </dl>
        <pre className="mt-5 overflow-x-auto border border-[var(--navy-300)] p-4 text-xs leading-6 whitespace-pre-wrap text-[var(--navy-700)]">
          {workspace.finalIntakePayload === null
            ? "저장된 최종 제출 원본이 없습니다."
            : JSON.stringify(workspace.finalIntakePayload, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function createGroupedRows(
  workspace: CaseWorkspace,
  questionLabels: Record<string, string>,
): Record<AdminResponseGroup, ResponseRow[]> {
  const grouped: Record<AdminResponseGroup, ResponseRow[]> = {
    author: [],
    business: [],
    history: [],
    changes: [],
    profiles: [],
    evidence: [],
    confirmation: [],
  };
  const added = new Set<string>();
  const current = workspace.currentBusiness;
  const history = workspace.historySummary;

  function add(group: AdminResponseGroup, key: string, fallback: unknown) {
    const value = Object.hasOwn(workspace.customerAnswers, key)
      ? workspace.customerAnswers[key]
      : fallback;
    grouped[group].push({
      key,
      label: getAdminAnswerLabel(key, questionLabels),
      value,
    });
    added.add(key);
  }

  add("author", "customer_name", workspace.case.customer_name);
  add("author", "customer_phone", workspace.case.customer_phone);
  add(
    "author",
    "customer_contact_channel",
    workspace.case.customer_contact_channel,
  );
  add(
    "author",
    "customer_preferred_title",
    current?.customer_preferred_title,
  );
  add(
    "author",
    "preferred_contact_method",
    current?.preferred_contact_method,
  );
  add(
    "author",
    "relationship_to_business",
    current?.relationship_to_business,
  );
  add("author", "authority_status", current?.authority_status);

  for (const [key, value] of [
    ["sign_name", current?.sign_name],
    ["entrance_sign_name", current?.entrance_sign_name],
    ["registration_name", current?.registration_name],
    ["permit_name", current?.permit_name],
    ["official_address", current?.official_address],
    ["building_name", current?.building_name],
    ["floor_structure", current?.floor_structure],
    ["independent_business_count", current?.independent_business_count],
    ["entrance_structure", current?.entrance_structure],
    ["floor_independence_signals", current?.floor_independence_signals],
    ["primary_activity", current?.primary_activity],
    ["opening_hours", current?.opening_hours],
    ["official_phone", current?.official_phone],
    ["official_website", current?.official_website],
    ["desired_standard_name", current?.desired_standard_name],
    ["keyword_name_history", current?.keyword_name_history],
    ["raw_notes", current?.raw_notes],
  ] as const) {
    add("business", key, value);
  }

  for (const [key, value] of [
    ["first_registration_period", history?.first_registration_period],
    ["creation_attempt_count", history?.creation_attempt_count],
    ["suspension_count", history?.suspension_count],
    ["account_count", history?.account_count],
    ["third_party_count", history?.third_party_count],
    ["old_account_access_status", history?.old_account_access_status],
    ["appeal_status", history?.appeal_status],
    ["recreated_during_appeal", history?.recreated_during_appeal],
    ["overall_history", history?.overall_history],
  ] as const) {
    add("history", key, value);
  }

  for (const key of [
    "final_confirmation",
    "credential_confirmation",
    "scope_confirmation",
  ]) {
    add("confirmation", key, undefined);
  }

  for (const [key, value] of Object.entries(workspace.customerAnswers)) {
    if (key === "case_id" || added.has(key)) continue;
    const metadata = workspace.questionMetadata[key];
    const group = getAdminAnswerGroup(key, metadata?.sectionKey);
    grouped[group].push({
      key,
      label: getAdminAnswerLabel(key, questionLabels),
      value,
    });
  }

  return grouped;
}

function SubmissionGroup({
  number,
  group,
  title,
  rows,
  workspace,
  questionLabels,
}: {
  number: number;
  group: AdminResponseGroup;
  title: string;
  rows: ResponseRow[];
  workspace: CaseWorkspace;
  questionLabels: Record<string, string>;
}) {
  const hasRecords =
    (group === "history" && workspace.historyEvents.length > 0) ||
    (group === "changes" && workspace.thirdParties.length > 0) ||
    (group === "profiles" && workspace.profiles.length > 0) ||
    (group === "evidence" && workspace.evidence.length > 0);

  return (
    <section aria-labelledby={`submission-group-${group}`}>
      <div className="flex items-baseline gap-3 border-b-2 border-[var(--navy-950)] pb-3">
        <span className="text-xs font-black text-[var(--navy-700)]">
          {String(number).padStart(2, "0")}
        </span>
        <h3 id={`submission-group-${group}`} className="text-2xl font-black">
          {title}
        </h3>
      </div>
      {rows.length ? (
        <ResponseList rows={rows} />
      ) : !hasRecords ? (
        <p className="mt-5 text-sm text-[var(--navy-700)]">
          제출된 정보가 없습니다.
        </p>
      ) : null}
      {group === "history" ? (
        <RecordCollection
          title="등록·정지 사건별 내용"
          records={workspace.historyEvents}
          keys={[
            "approximate_period",
            "handled_by",
            "handler_type",
            "account_label",
            "profile_name",
            "address",
            "floor",
            "map_pin_notes",
            "phone",
            "website",
            "primary_category",
            "additional_categories",
            "verification_method",
            "approval_status",
            "final_result",
            "google_message",
            "changes_before_result",
            "appeal_pending_when_recreated",
            "same_account_other_suspensions",
            "ownership_change_notes",
            "evidence_notes",
          ]}
          questionLabels={questionLabels}
        />
      ) : null}
      {group === "changes" ? (
        <RecordCollection
          title="담당자·대행사별 내용"
          records={workspace.thirdParties}
          keys={[
            "party_name",
            "party_type",
            "approximate_period",
            "work_requested",
            "account_access_level",
            "changes_made",
            "notes",
          ]}
          questionLabels={questionLabels}
        />
      ) : null}
      {group === "profiles" ? (
        <RecordCollection
          title="프로필 후보별 내용"
          records={workspace.profiles}
          keys={[
            "maps_url",
            "displayed_name",
            "displayed_address",
            "displayed_floor",
            "map_pin_notes",
            "displayed_phone",
            "displayed_website",
            "displayed_category",
            "rating",
            "review_count",
            "possible_creator",
            "customer_controls_profile",
            "ownership_request_status",
            "relation_notes",
            "independent_business_signals",
          ]}
          questionLabels={questionLabels}
        />
      ) : null}
      {group === "evidence" ? (
        <RecordCollection
          title="제출 파일별 내용"
          records={workspace.evidence}
          keys={[
            "evidence_category",
            "original_filename",
            "customer_description",
            "uploaded_by_type",
            "created_at",
          ]}
          questionLabels={questionLabels}
        />
      ) : null}
    </section>
  );
}

function ResponseList({ rows }: { rows: ResponseRow[] }) {
  return (
    <dl className="divide-y divide-[var(--navy-300)] border-b border-[var(--navy-300)]">
      {rows.map((row) => (
        <div
          key={row.key}
          className="grid gap-2 py-4 text-sm sm:grid-cols-[15rem_1fr]"
        >
          <dt className="font-bold">{row.label}</dt>
          <dd className="break-words whitespace-pre-wrap text-[var(--navy-700)]">
            {formatAdminAnswerValue(row.key, row.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function RecordCollection({
  title,
  records,
  keys,
  questionLabels,
}: {
  title: string;
  records: object[];
  keys: string[];
  questionLabels: Record<string, string>;
}) {
  if (records.length === 0) return null;
  return (
    <div className="mt-7">
      <h4 className="text-sm font-black">{title}</h4>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {records.map((sourceRecord, index) => {
          const record = sourceRecord as Record<string, unknown>;
          return (
            <article
              key={String(record.id ?? index)}
              className="border border-[var(--navy-300)] p-5"
            >
              <p className="text-xs font-black text-[var(--navy-700)]">
                항목 {String(index + 1).padStart(2, "0")}
              </p>
              <dl className="mt-3 divide-y divide-[var(--navy-300)]">
                {keys.map((key) => (
                  <div key={key} className="grid gap-1 py-3 text-sm">
                    <dt className="font-bold">
                      {getAdminAnswerLabel(key, questionLabels)}
                    </dt>
                    <dd className="break-words whitespace-pre-wrap text-[var(--navy-700)]">
                      {key === "created_at" && typeof record[key] === "string"
                        ? formatDateTime(record[key])
                        : formatAdminAnswerValue(key, record[key])}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
