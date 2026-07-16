import Link from "next/link";

import { IntakeShell } from "@/components/intake/intake-shell";
import { loadPublicIntakeBundle } from "@/lib/public-intake";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function IntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const token = (await params).token;
  const bundle = await loadPublicIntakeBundle(token);

  if (!bundle) return <UnavailableLink />;
  if (bundle.intakeStatus === "submitted") {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center px-5 py-16 sm:px-8">
        <div className="w-full border-l-4 border-[var(--navy-950)] pl-6">
          <p className="text-xs font-bold tracking-[0.18em] text-[var(--navy-700)] uppercase">
            {bundle.caseCode}
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-[-0.05em]">
            이미 안전하게 제출된 사건입니다.
          </h1>
          <p className="mt-5 text-sm leading-7 text-[var(--navy-700)]">
            추가 작성이 필요하면 WeThru 담당자가 링크를 다시 열어드릴 수
            있습니다.
          </p>
          <Link
            href={`/intake/${token}/complete`}
            className="mt-7 inline-block min-h-12 border-b border-[var(--navy-950)] py-3 text-sm font-bold"
          >
            제출 완료 안내 보기
          </Link>
        </div>
      </main>
    );
  }
  return <IntakeShell token={token} bundle={bundle} />;
}

function UnavailableLink() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-5 py-16 sm:px-8">
      <div className="w-full border-l-4 border-[var(--navy-950)] pl-6">
        <p className="text-lg font-black">WeThru</p>
        <h1 className="mt-8 text-4xl font-black tracking-[-0.05em]">
          이 링크를 확인하기 어렵습니다.
        </h1>
        <p className="mt-5 text-sm leading-7 text-[var(--navy-700)]">
          링크가 만료되었거나 새 링크로 교체되었을 수 있습니다. 전달받은 주소
          전체를 다시 열어보시고, 계속 보이지 않으면 담당자에게 알려주세요.
        </p>
      </div>
    </main>
  );
}
