import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { TokenControls } from "@/components/admin/token-controls";
import { CaseOperations } from "@/components/admin/workspace/case-operations";
import {
  CaseWorkspaceView,
  isWorkspaceTab,
  workspaceTabs,
} from "@/components/admin/workspace/case-workspace-view";
import { requireAdmin } from "@/lib/admin-auth";
import { getCaseWorkspace } from "@/lib/case-workspace";
import {
  caseStatusLabels,
  intakeStatusLabels,
  type CaseStatus,
} from "@/lib/case-status";
import {
  canChangeCaseSetup,
  caseSetupCreateNewMessage,
  caseSetupUnavailableMessage,
} from "@/lib/case-setup";

export const dynamic = "force-dynamic";

export default async function AdminCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();
  const idResult = z.uuid().safeParse((await params).id);
  if (!idResult.success) notFound();
  const workspace = await getCaseWorkspace(idResult.data);
  if (!workspace) notFound();
  const requestedTab = (await searchParams).tab;
  const tab = isWorkspaceTab(requestedTab) ? requestedTab : "summary";

  return (
    <main className="mx-auto max-w-[96rem] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <header className="border-b border-[var(--navy-300)] pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/admin"
            className="text-sm font-bold text-[var(--navy-700)]"
          >
            ← 사건 대시보드
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={`/admin/cases/${workspace.case.id}/edit`}
              className="min-h-11 border-b border-[var(--navy-950)] px-3 py-3 text-center text-sm font-bold"
            >
              사건 설정 수정
            </Link>
            {canChangeCaseSetup(workspace.case.intake_status) ? (
              <Link
                href={`/admin/cases/${workspace.case.id}/clone`}
                className="min-h-11 border-b border-[var(--navy-950)] px-3 py-3 text-center text-sm font-bold"
              >
                설정 복제 후 새 링크 만들기
              </Link>
            ) : null}
            <Link
              href={`/admin/cases/${workspace.case.id}/print`}
              className="min-h-11 border-b border-[var(--navy-950)] px-3 py-3 text-center text-sm font-bold"
            >
              인쇄용 사건 요약
            </Link>
          </div>
        </div>
        {!canChangeCaseSetup(workspace.case.intake_status) ? (
          <div className="mt-6 border-l-2 border-[var(--navy-950)] pl-4 text-sm leading-6 text-[var(--navy-700)]">
            <p>{caseSetupUnavailableMessage}</p>
            <p>{caseSetupCreateNewMessage}</p>
          </div>
        ) : null}
        <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[var(--navy-700)] uppercase">
              {workspace.case.case_code}
            </p>
            <p className="mt-2 text-xs text-[var(--navy-700)]">
              사건 ID {workspace.case.id}
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
              {workspace.case.business_name}
            </h1>
            <p className="mt-3 text-sm text-[var(--navy-700)]">
              {workspace.case.customer_name ?? "고객명 미입력"} ·{" "}
              {workspace.moduleTitles.join(", ")}
            </p>
          </div>
          <div className="text-right text-sm leading-6 text-[var(--navy-700)]">
            <p className="font-bold text-[var(--navy-950)]">
              {caseStatusLabels[
                workspace.case.status as keyof typeof caseStatusLabels
              ] ?? workspace.case.status}
            </p>
            <p>
              {intakeStatusLabels[
                workspace.case.intake_status as keyof typeof intakeStatusLabels
              ] ?? workspace.case.intake_status}
            </p>
            <p>마지막 변경 {formatDateTime(workspace.case.updated_at)}</p>
          </div>
        </div>
      </header>

      <div className="mt-7">
        <CaseOperations
          caseId={workspace.case.id}
          currentStatus={workspace.case.status as CaseStatus}
          intakeStatus={workspace.case.intake_status}
          retentionReviewAt={workspace.case.retention_review_at}
        />
      </div>
      <div className="mt-7">
        <TokenControls
          caseId={workspace.case.id}
          initialStatus={workspace.case.token_status}
        />
      </div>

      <nav
        className="mt-10 overflow-x-auto border-y border-[var(--navy-300)]"
        aria-label="사건 작업공간"
      >
        <div className="flex min-w-max">
          {workspaceTabs.map(([key, label], index) => (
            <Link
              key={key}
              href={`/admin/cases/${workspace.case.id}?tab=${key}`}
              aria-current={tab === key ? "page" : undefined}
              className={`min-h-14 border-r border-[var(--navy-300)] px-5 py-4 text-sm font-bold ${tab === key ? "bg-[var(--navy-950)] text-white" : "bg-[var(--neutral-50)] text-[var(--navy-700)]"}`}
            >
              <span className="mr-2 text-xs opacity-60">
                {String(index + 1).padStart(2, "0")}
              </span>
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <section className="py-12 lg:py-16">
        <CaseWorkspaceView workspace={workspace} tab={tab} />
      </section>
    </main>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
