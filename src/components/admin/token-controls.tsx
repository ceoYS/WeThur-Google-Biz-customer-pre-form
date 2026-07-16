"use client";

import { Copy, ExternalLink, RefreshCw, Unlink } from "lucide-react";
import { useState } from "react";

export function TokenControls({
  caseId,
  initialStatus,
}: {
  caseId: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [url, setUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function mutate(action: "regenerate" | "revoke") {
    if (
      action === "regenerate" &&
      !window.confirm(
        "기존 고객 링크는 즉시 사용할 수 없게 됩니다. 새 링크를 만들까요?",
      )
    ) {
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/cases/${caseId}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = (await response.json()) as {
        error?: string;
        status?: string;
        intakeUrl?: string;
      };
      if (!response.ok)
        throw new Error(result.error ?? "링크 상태를 변경하지 못했습니다.");
      setStatus(result.status ?? status);
      setUrl(result.intakeUrl ?? null);
      setMessage(
        action === "revoke"
          ? "고객 링크를 해지했습니다."
          : "새 링크를 만들었습니다. 지금 복사해주세요.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "요청을 처리하지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  async function copyUrl() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setMessage("고객 링크를 복사했습니다.");
  }

  return (
    <section className="border-y border-[var(--navy-300)] py-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold">고객 보안 링크</p>
          <p className="mt-2 text-sm leading-6 text-[var(--navy-700)]">
            상태: {status === "active" ? "사용 가능" : "해지됨"}. 원본 링크는
            생성 직후에만 표시됩니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => mutate("regenerate")}
            className="inline-flex min-h-11 items-center gap-2 border border-[var(--navy-950)] px-4 text-sm font-bold disabled:opacity-50"
          >
            <RefreshCw className="size-4" /> 새 링크 만들기
          </button>
          <button
            type="button"
            disabled={pending || status === "revoked"}
            onClick={() => mutate("revoke")}
            className="inline-flex min-h-11 items-center gap-2 px-4 text-sm font-bold text-[var(--navy-700)] disabled:opacity-40"
          >
            <Unlink className="size-4" /> 링크 해지
          </button>
        </div>
      </div>
      {url ? (
        <div className="mt-6 border-l-2 border-[var(--navy-950)] pl-5">
          <p className="text-sm leading-6 break-all">{url}</p>
          <div className="mt-3 flex gap-4">
            <button
              type="button"
              onClick={copyUrl}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-bold"
            >
              <Copy className="size-4" /> 복사
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-bold"
            >
              <ExternalLink className="size-4" /> 미리보기
            </a>
          </div>
        </div>
      ) : null}
      {message ? (
        <p role="status" className="mt-4 text-sm text-[var(--navy-700)]">
          {message}
        </p>
      ) : null}
    </section>
  );
}
