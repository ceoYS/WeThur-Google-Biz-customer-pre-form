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

export default async function EditCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const idResult = z.uuid().safeParse((await params).id);
  if (!idResult.success) notFound();
  const setup = await loadCaseSetup(idResult.data, admin);
  if (!setup) notFound();
  const editable = canChangeCaseSetup(setup.case.intake_status);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-12">
      <header className="mb-12 border-b border-[var(--navy-300)] pb-7">
        <Link
          href={`/admin/cases/${setup.case.id}`}
          className="text-sm font-bold text-[var(--navy-700)]"
        >
          ← 사건 작업공간
        </Link>
        <p className="mt-9 text-xs font-bold tracking-[0.18em] text-[var(--navy-700)] uppercase">
          {setup.case.case_code}
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
          기존 사건 설정 수정
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--navy-700)]">
          기존 사건과 보안 고객 링크를 유지하면서 미작성 사건의 설정을
          변경합니다.
        </p>
      </header>
      {editable ? (
        <CaseConfigurationEditor
          caseId={setup.case.id}
          modules={setup.modules}
          admins={setup.admins}
          initialValues={setup.initialValues}
        />
      ) : (
        <SetupUnavailableNotice caseId={setup.case.id} />
      )}
    </main>
  );
}

function SetupUnavailableNotice({ caseId }: { caseId: string }) {
  return (
    <section className="border-l-4 border-[var(--navy-950)] pl-6">
      <p className="text-xs font-bold tracking-[0.16em] text-[var(--navy-700)] uppercase">
        고객 작성 시작됨 또는 최종 제출 완료
      </p>
      <h2 className="mt-3 text-xl font-black">
        사건 설정을 수정할 수 없습니다.
      </h2>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--navy-700)]">
        {caseSetupUnavailableMessage}
      </p>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--navy-700)]">
        {caseSetupCreateNewMessage}
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/admin/cases/new"
          className="min-h-12 bg-[var(--navy-950)] px-5 py-3 text-center text-sm font-bold text-white"
        >
          신규 사건 만들기
        </Link>
        <Link
          href={`/admin/cases/${caseId}`}
          className="min-h-12 px-5 py-3 text-center text-sm font-bold"
        >
          사건 화면으로 돌아가기
        </Link>
      </div>
    </section>
  );
}
