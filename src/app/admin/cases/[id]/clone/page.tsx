import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { CaseConfigurationEditor } from "@/components/admin/case-configuration-editor";
import { requireAdmin } from "@/lib/admin-auth";
import {
  canChangeCaseSetup,
  caseSetupCreateNewMessage,
  caseSetupUnavailableMessage,
  loadCaseSetup,
} from "@/lib/case-setup";

export const dynamic = "force-dynamic";

export default async function CloneCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const idResult = z.uuid().safeParse((await params).id);
  if (!idResult.success) notFound();
  const setup = await loadCaseSetup(idResult.data, admin);
  if (!setup) notFound();
  const cloneable = canChangeCaseSetup(setup.case.intake_status);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-12">
      <header className="mb-12 border-b border-[var(--navy-300)] pb-7">
        <Link
          href={`/admin/cases/${setup.case.id}`}
          className="text-sm font-bold text-[var(--navy-700)]"
        >
          ← 원본 사건
        </Link>
        <p className="mt-9 text-xs font-bold tracking-[0.18em] text-[var(--navy-700)] uppercase">
          원본 사건 {setup.case.case_code}
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
          기존 설정으로 새 사건 만들기
        </h1>
        <div className="mt-6 border-l-4 border-[var(--navy-950)] pl-5">
          <p className="font-bold">기존 사건의 설정만 복사합니다.</p>
          <p className="mt-2 text-sm leading-6 text-[var(--navy-700)]">
            고객 답변, 제출 자료, 진단 결과와 기존 보안 링크는 복사하지
            않습니다.
          </p>
        </div>
      </header>
      {cloneable ? (
        <>
          <section className="mb-12 grid gap-px bg-[var(--navy-300)] sm:grid-cols-2">
            <div className="bg-[var(--neutral-50)] p-5">
              <h2 className="font-black">복사되는 항목</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--navy-700)]">
                기본 설정, 질문 모듈, 사전 확인 사실, 프로필 후보, 맞춤 질문,
                요청 증빙과 정렬 순서
              </p>
            </div>
            <div className="bg-[var(--neutral-50)] p-5">
              <h2 className="font-black">복사되지 않는 항목</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--navy-700)]">
                고객 답변, 파일, 진단, 메모, 활동 기록, 기존 사건 식별자와 보안
                링크
              </p>
            </div>
          </section>
          <CaseConfigurationEditor
            caseId={setup.case.id}
            modules={setup.modules}
            admins={setup.admins}
            initialValues={setup.initialValues}
            mode="clone"
          />
        </>
      ) : (
        <section className="border-l-4 border-[var(--navy-950)] pl-6">
          <p className="text-xs font-bold tracking-[0.16em] text-[var(--navy-700)] uppercase">
            고객 작성 시작됨 또는 최종 제출 완료
          </p>
          <h2 className="mt-3 text-xl font-black">
            현재 사건 설정을 안전하게 복제할 수 없습니다.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--navy-700)]">
            {caseSetupUnavailableMessage}
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--navy-700)]">
            {caseSetupCreateNewMessage}
          </p>
          <Link
            href="/admin/cases/new"
            className="mt-7 inline-flex min-h-12 items-center bg-[var(--navy-950)] px-5 text-sm font-bold text-white"
          >
            신규 사건 만들기
          </Link>
        </section>
      )}
    </main>
  );
}
