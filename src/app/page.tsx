import { ArrowRight, LockKeyhole, Route, Rows3 } from "lucide-react";
import Link from "next/link";

const operatingSteps = [
  {
    number: "01",
    title: "과거 흐름 정리",
    description:
      "기억나는 범위에서 등록, 인증, 변경, 중단 과정을 시간순으로 모읍니다.",
  },
  {
    number: "02",
    title: "현재 정보 비교",
    description:
      "실제 사업장 정보와 지도에 보이는 프로필 후보를 한 화면에서 비교합니다.",
  },
  {
    number: "03",
    title: "안전한 다음 경로",
    description:
      "확인된 사실과 부족한 자료를 구분한 뒤 가능한 공식 경로를 결정합니다.",
  },
] as const;

export default function HomePage() {
  return (
    <main>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="text-lg font-black tracking-[-0.04em] text-[var(--navy-950)]"
        >
          WeThru
        </Link>
        <Link
          href="/admin/login"
          className="min-h-11 border-b border-[var(--navy-950)] px-1 py-3 text-sm font-semibold text-[var(--navy-950)]"
        >
          관리자 로그인
        </Link>
      </header>

      <section className="mx-auto grid min-h-[68vh] max-w-7xl items-end gap-12 px-5 pt-14 pb-20 sm:px-8 lg:grid-cols-[1.25fr_0.75fr] lg:px-12 lg:pt-24 lg:pb-28">
        <div className="reveal max-w-4xl">
          <p className="mb-7 text-xs font-bold tracking-[0.22em] text-[var(--navy-700)] uppercase">
            Google Business Profile Case System
          </p>
          <h1 className="text-[clamp(2.5rem,5vw,3.75rem)] leading-[0.95] font-black tracking-[-0.05em] text-balance break-keep text-[var(--navy-950)]">
            문제를 다시 만들지 않도록,
            <br />
            먼저 흐름을 봅니다.
          </h1>
        </div>

        <div className="reveal reveal-delay-1 border-l-2 border-[var(--navy-950)] pl-6 lg:mb-2">
          <p className="text-lg leading-8 font-medium text-[var(--navy-900)]">
            누가 잘못했는지를 찾는 설문이 아닙니다. 실제 사업장, 과거 등록 이력,
            현재 지도 정보를 차분히 연결해 원인 가설과 다음 확인 순서를
            정리합니다.
          </p>
          <p className="mt-5 text-sm leading-6 text-[var(--navy-700)]">
            고객별 보안 링크로만 작성하며, Google 비밀번호·OTP·복구 코드는
            요청하지 않습니다.
          </p>
        </div>
      </section>

      <section className="bg-[var(--navy-950)] text-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="mb-12 flex flex-col justify-between gap-4 border-b border-white/25 pb-7 sm:flex-row sm:items-end">
            <h2 className="text-3xl font-black tracking-[-0.04em] break-keep sm:text-5xl">
              한 사건을 읽는 세 단계
            </h2>
            <p className="max-w-md text-sm leading-6 text-white/70">
              자동 점수만으로 결론을 내리지 않습니다. 시스템은 단서를 정리하고,
              최종 경로는 담당자가 판단합니다.
            </p>
          </div>
          <ol className="grid gap-px bg-white/25 lg:grid-cols-3">
            {operatingSteps.map((step) => (
              <li
                key={step.number}
                className="min-h-64 bg-[var(--navy-950)] p-7 sm:p-9"
              >
                <span className="text-xs font-bold tracking-[0.2em] text-white/55">
                  {step.number}
                </span>
                <h3 className="mt-14 text-2xl font-bold tracking-[-0.03em]">
                  {step.title}
                </h3>
                <p className="mt-4 max-w-sm text-sm leading-7 text-white/70">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:px-12 lg:py-28">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-[var(--navy-700)] uppercase">
            Designed for trust
          </p>
          <h2 className="mt-5 max-w-xl text-4xl leading-tight font-black tracking-[-0.05em] text-balance break-keep text-[var(--navy-950)] sm:text-5xl">
            고객에게는 단순하게,
            <br />
            검토자에게는 구조적으로.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {[
            [
              LockKeyhole,
              "비공개 증빙",
              "첨부 자료는 공개 URL이 아닌 짧은 만료 링크로만 확인합니다.",
            ],
            [
              Rows3,
              "사건별 질문",
              "공통·업종·이슈 모듈을 조합해 필요한 질문만 보여줍니다.",
            ],
            [
              Route,
              "가설과 경로 분리",
              "Google의 판단을 단정하지 않고 확인할 가설과 안전한 행동을 구분합니다.",
            ],
          ].map(([Icon, title, description]) => {
            const FeatureIcon = Icon as typeof LockKeyhole;
            return (
              <article
                key={String(title)}
                className="flex gap-5 border-t border-[var(--navy-300)] py-6"
              >
                <FeatureIcon
                  className="mt-1 size-5 shrink-0 text-[var(--navy-900)]"
                  strokeWidth={1.8}
                />
                <div>
                  <h3 className="font-bold text-[var(--navy-950)]">
                    {String(title)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--navy-700)]">
                    {String(description)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-[var(--navy-300)] bg-[var(--neutral-100)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <div>
            <p className="font-black tracking-[-0.03em]">WeThru</p>
            <p className="mt-1 text-xs text-[var(--navy-700)]">
              Google 비즈니스 프로필 사전 진단
            </p>
          </div>
          <Link
            href="/privacy"
            className="inline-flex min-h-11 items-center gap-2 py-3 text-sm font-semibold"
          >
            개인정보 및 보관 안내 <ArrowRight className="size-4" />
          </Link>
        </div>
      </footer>
    </main>
  );
}
