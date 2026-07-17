"use client";

import { useActionState } from "react";

import { initialLoginActionState } from "@/app/admin/login/action-state";
import { requestMagicLink } from "@/app/admin/login/actions";

export function MagicLinkForm({
  configured,
  initialErrorMessage,
}: {
  configured: boolean;
  initialErrorMessage?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    requestMagicLink,
    initialLoginActionState,
  );
  const hasActionMessage = Boolean(state.message);
  const displayedMessage = state.message || initialErrorMessage;
  const messageIsError = hasActionMessage
    ? state.status === "error"
    : Boolean(initialErrorMessage);

  return (
    <form action={formAction} className="mt-10 space-y-6">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-bold">
          관리자 이메일
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={!configured || pending}
          className="min-h-14 w-full rounded-none border border-[var(--navy-300)] bg-white px-4 text-base text-[var(--navy-950)] disabled:opacity-55"
          placeholder="admin@example.com"
        />
      </div>
      <button
        type="submit"
        disabled={!configured || pending}
        className="min-h-14 w-full bg-[var(--navy-950)] px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "로그인 링크 요청 중" : "이메일로 로그인 링크 받기"}
      </button>
      {displayedMessage ? (
        <p
          role={messageIsError ? "alert" : "status"}
          className="border-l-2 border-[var(--navy-900)] pl-4 text-sm leading-6"
        >
          {displayedMessage}
        </p>
      ) : null}
      {!configured ? (
        <p className="text-sm leading-6 text-[var(--navy-700)]">
          현재 배포 환경에 Supabase 공개 설정이 연결되지 않았습니다.
        </p>
      ) : null}
    </form>
  );
}
