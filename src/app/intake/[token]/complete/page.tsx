import { redirect } from "next/navigation";

import { loadPublicIntakeBundle } from "@/lib/public-intake";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function IntakeCompletePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const token = (await params).token;
  const bundle = await loadPublicIntakeBundle(token);
  if (!bundle) redirect("/");
  if (bundle.intakeStatus !== "submitted") redirect(`/intake/${token}`);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-5 py-16 sm:px-8">
      <section className="w-full">
        <p className="text-lg font-black tracking-[-0.04em]">WeThru</p>
        <div className="mt-14 border-l-4 border-[var(--navy-950)] pl-6 sm:pl-9">
          <p className="text-xs font-bold tracking-[0.18em] text-[var(--navy-700)] uppercase">
            {bundle.caseCode}
          </p>
          <h1 className="mt-5 text-4xl leading-tight font-black tracking-[-0.05em] sm:text-6xl">
            대표님, 내용이 정상적으로 전달되었습니다.
          </h1>
          <p className="mt-7 text-base leading-8 text-[var(--navy-700)]">
            보내주신 답변과 자료를 바탕으로 과거 등록 흐름과 현재 지도 상태를
            비교한 뒤, 먼저 확인해야 할 원인과 가장 안전한 다음 진행 방향을
            정리해드리겠습니다.
          </p>
          <p className="mt-4 text-base leading-8 text-[var(--navy-700)]">
            추가로 확인이 필요한 내용이 있으면 이해하기 쉬운 질문으로 다시
            안내드리겠습니다.
          </p>
        </div>
        <div className="mt-12 grid gap-px bg-[var(--navy-300)] sm:grid-cols-3">
          {[
            "답변과 자료 확인",
            "과거·현재 정보 비교",
            "필요한 다음 질문 안내",
          ].map((item, index) => (
            <div
              key={item}
              className="bg-[var(--neutral-50)] p-5 text-sm font-bold"
            >
              <span className="mr-3 text-[var(--navy-700)]">0{index + 1}</span>
              {item}
            </div>
          ))}
        </div>
        <p className="mt-10 text-xs leading-6 text-[var(--navy-700)]">
          이 사전 진단은 Google 승인, 복구, 인증, 노출, 삭제 또는 소유권 이전을
          보장하지 않습니다.
        </p>
      </section>
    </main>
  );
}
