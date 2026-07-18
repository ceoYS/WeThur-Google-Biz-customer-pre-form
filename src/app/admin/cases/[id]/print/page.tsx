import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PrintButton } from "@/components/admin/print-button";
import { requireAdmin } from "@/lib/admin-auth";
import { formatAdminAnswerValue } from "@/lib/admin-response-format";
import { getCaseWorkspace } from "@/lib/case-workspace";
import { caseStatusLabels, intakeStatusLabels } from "@/lib/case-status";

export const dynamic = "force-dynamic";

export default async function CasePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const workspace = await getCaseWorkspace(id.data);
  if (!workspace) notFound();
  const hypotheses = records(workspace.diagnosis?.hypotheses);
  const missing = records(workspace.diagnosis?.missing_information);

  return (
    <main className="print-brief mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <div className="mb-10 flex items-center justify-between gap-4 print:hidden">
        <Link
          href={`/admin/cases/${workspace.case.id}`}
          className="text-sm font-black"
        >
          ← 사건 작업공간
        </Link>
        <PrintButton />
      </div>
      <header className="border-b-4 border-[var(--navy-950)] pb-8">
        <p className="text-xs font-black tracking-[0.18em] text-[var(--navy-700)] uppercase">
          WeThru 사건 요약 · {workspace.case.case_code}
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
          {workspace.case.business_name}
        </h1>
        <p className="mt-4 text-sm text-[var(--navy-700)]">
          {workspace.case.customer_name ?? "고객명 미확인"} ·{" "}
          {workspace.moduleTitles.join(", ")}
        </p>
        <p className="mt-2 text-xs text-[var(--navy-700)]">
          출력 시각 {formatDate(new Date().toISOString())}
        </p>
      </header>

      <PrintSection title="사건 요약">
        <Grid
          items={[
            [
              "사건 상태",
              caseStatusLabels[
                workspace.case.status as keyof typeof caseStatusLabels
              ] ?? workspace.case.status,
            ],
            [
              "작성 상태",
              intakeStatusLabels[
                workspace.case
                  .intake_status as keyof typeof intakeStatusLabels
              ] ?? workspace.case.intake_status,
            ],
            [
              "제출 시각",
              workspace.case.submitted_at
                ? formatDate(workspace.case.submitted_at)
                : "미제출",
            ],
            [
              "관리자 결정",
              workspace.diagnosis?.admin_decision_path
                ? `경로 ${workspace.diagnosis.admin_decision_path}`
                : "미결정",
            ],
            [
              "과거 등록 시도",
              workspace.historySummary?.creation_attempt_count,
            ],
            ["정지·사라짐", workspace.historySummary?.suspension_count],
            ["현재 후보", workspace.profiles.length],
            ["증빙", workspace.evidence.length],
          ]}
        />
      </PrintSection>

      <PrintSection title="현재 공식 사업장">
        <Grid
          items={[
            [
              "권한 상태",
              formatAdminAnswerValue(
                "authority_status",
                workspace.currentBusiness?.authority_status,
              ),
            ],
            ["상시 간판명", workspace.currentBusiness?.sign_name],
            ["사업자등록 상호", workspace.currentBusiness?.registration_name],
            ["영업허가명", workspace.currentBusiness?.permit_name],
            ["주소", workspace.currentBusiness?.official_address],
            ["층", workspace.currentBusiness?.floor_structure],
            ["전화", workspace.currentBusiness?.official_phone],
            ["웹사이트", workspace.currentBusiness?.official_website],
          ]}
        />
      </PrintSection>

      <PrintSection title="과거 등록 타임라인">
        <div className="space-y-4">
          {workspace.historyEvents.map((event, index) => (
            <article
              key={event.id}
              className="break-inside-avoid border-l-4 border-[var(--navy-950)] pl-5"
            >
              <p className="text-xs font-black text-[var(--navy-700)]">
                {String(index + 1).padStart(2, "0")} ·{" "}
                {event.approximate_period ?? "시기 미확인"}
              </p>
              <h3 className="mt-1 font-black">
                {event.profile_name ?? "프로필명 미확인"}
              </h3>
              <p className="mt-2 text-sm leading-6">
                {[
                  event.handled_by,
                  event.address,
                  event.floor,
                  event.phone,
                  event.primary_category,
                ]
                  .filter(Boolean)
                  .join(" · ") || "세부 정보 미확인"}
              </p>
              <p className="mt-1 text-sm text-[var(--navy-700)]">
                결과: {event.final_result ?? "미확인"}
              </p>
            </article>
          ))}
          {workspace.historyEvents.length === 0 ? (
            <p className="text-sm">등록된 이력이 없습니다.</p>
          ) : null}
        </div>
      </PrintSection>

      <PrintSection title="현재 관련 프로필 후보">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr>
              {["이름", "주소·층", "전화", "웹사이트", "카테고리", "관리"].map(
                (label) => (
                  <th
                    key={label}
                    className="border border-[var(--navy-300)] p-2"
                  >
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {workspace.profiles.map((profile) => (
              <tr key={profile.id}>
                <Cell value={profile.displayed_name} />
                <Cell
                  value={[profile.displayed_address, profile.displayed_floor]
                    .filter(Boolean)
                    .join(" · ")}
                />
                <Cell value={profile.displayed_phone} />
                <Cell value={profile.displayed_website} />
                <Cell value={profile.displayed_category} />
                <Cell
                  value={formatAdminAnswerValue(
                    "customer_controls_profile",
                    profile.customer_controls_profile,
                  )}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </PrintSection>

      <PrintSection title="우선 원인 가설">
        <div className="space-y-5">
          {hypotheses.slice(0, 5).map((item, index) => (
            <article
              key={index}
              className="break-inside-avoid border border-[var(--navy-300)] p-4"
            >
              <p className="text-xs font-black text-[var(--navy-700)]">
                {value(item.confidence)} · 점수 {value(item.score)}
              </p>
              <h3 className="mt-2 font-black">{value(item.title)}</h3>
              <p className="mt-2 text-sm leading-6">
                안전한 다음 행동: {value(item.safeNextAction)}
              </p>
              <p className="mt-1 text-sm text-[var(--navy-700)]">
                아직 단정하면 안 되는 점: {value(item.mustNotConclude)}
              </p>
            </article>
          ))}
        </div>
      </PrintSection>

      <PrintSection title="부족한 정보">
        <ol className="space-y-3">
          {missing.map((item, index) => (
            <li
              key={index}
              className="break-inside-avoid border-l-2 border-[var(--navy-300)] pl-4 text-sm"
            >
              <strong>
                {index + 1}. {value(item.title)}
              </strong>
              <p className="mt-1 text-[var(--navy-700)]">
                {value(item.reason)}
              </p>
            </li>
          ))}
        </ol>
      </PrintSection>

      <PrintSection title="첨부 목록">
        <ul className="divide-y divide-[var(--navy-300)] border-y border-[var(--navy-300)]">
          {workspace.evidence.map((item) => (
            <li
              key={item.id}
              className="flex justify-between gap-4 py-3 text-sm"
            >
              <span>
                {formatAdminAnswerValue(
                  "evidence_category",
                  item.evidence_category,
                )}{" "}
                · {item.original_filename}
              </span>
              <span>{Math.ceil(item.size_bytes / 1024)} KB</span>
            </li>
          ))}
        </ul>
      </PrintSection>

      <footer className="mt-16 border-t border-[var(--navy-300)] pt-5 text-xs leading-5 text-[var(--navy-700)]">
        이 문서의 원인 항목은 제출 자료에 기초한 가설입니다. Google 승인, 복구,
        인증, 노출, 삭제, 순위 또는 소유권 이전을 보장하지 않으며 Google의
        비공개 판단 로직을 의미하지 않습니다.
      </footer>
    </main>
  );
}

function PrintSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="mb-5 border-b border-[var(--navy-300)] pb-3 text-2xl font-black">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Grid({ items }: { items: Array<[string, unknown]> }) {
  return (
    <dl className="grid border-t border-l border-[var(--navy-300)] sm:grid-cols-2">
      {items.map(([label, item]) => (
        <div
          key={label}
          className="grid grid-cols-[8rem_1fr] border-r border-b border-[var(--navy-300)] p-3 text-sm"
        >
          <dt className="font-black">{label}</dt>
          <dd>{value(item) || "미확인"}</dd>
        </div>
      ))}
    </dl>
  );
}

function Cell({ value: item }: { value: unknown }) {
  return (
    <td className="border border-[var(--navy-300)] p-2 align-top">
      {value(item) || "-"}
    </td>
  );
}
function records(item: unknown): Array<Record<string, unknown>> {
  return Array.isArray(item)
    ? item.filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
      )
    : [];
}
function value(item: unknown): string {
  if (item === null || item === undefined) return "";
  if (["string", "number", "boolean"].includes(typeof item))
    return String(item);
  if (Array.isArray(item)) return item.map(value).join(", ");
  return JSON.stringify(item);
}
function formatDate(item: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(item));
}
