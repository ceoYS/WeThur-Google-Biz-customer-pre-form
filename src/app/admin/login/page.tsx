import type { Metadata } from "next";
import Link from "next/link";

import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { hasPublicSupabaseEnvironment } from "@/lib/env.public";

export const metadata: Metadata = {
  title: "관리자 로그인",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
      <section className="flex flex-col justify-between bg-[var(--navy-950)] p-7 text-white sm:p-12 lg:p-16">
        <Link href="/" className="text-lg font-black tracking-[-0.04em]">
          WeThru
        </Link>
        <div className="py-20">
          <p className="text-xs font-bold tracking-[0.2em] text-white/60 uppercase">
            Private workspace
          </p>
          <h1 className="mt-5 text-5xl leading-[0.95] font-black tracking-[-0.06em] sm:text-7xl">
            사건의 흐름을
            <br />
            한곳에서 봅니다.
          </h1>
        </div>
        <p className="max-w-md text-sm leading-6 text-white/60">
          허용된 WeThru 관리자 이메일만 접근할 수 있습니다. 공용 기기에서는
          로그인 링크를 열지 마세요.
        </p>
      </section>
      <section className="flex items-center px-5 py-16 sm:px-12 lg:px-20">
        <div className="w-full max-w-md">
          <p className="text-xs font-bold tracking-[0.2em] text-[var(--navy-700)] uppercase">
            Administrator
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.05em]">
            관리자 로그인
          </h2>
          <p className="mt-4 text-sm leading-6 text-[var(--navy-700)]">
            비밀번호 대신 이메일로 일회성 로그인 링크를 보내드립니다.
          </p>
          <MagicLinkForm configured={hasPublicSupabaseEnvironment()} />
        </div>
      </section>
    </main>
  );
}
