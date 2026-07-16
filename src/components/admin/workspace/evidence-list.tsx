"use client";

import { ExternalLink, FileText, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { EvidenceItem } from "@/lib/case-workspace";

export function EvidenceList({
  caseId,
  evidence,
}: {
  caseId: string;
  evidence: EvidenceItem[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function openEvidence(evidenceId: string) {
    const popup = window.open("", "_blank", "noopener,noreferrer");
    setPendingId(evidenceId);
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/cases/${caseId}/evidence/${evidenceId}/signed-url`,
        { method: "POST" },
      );
      const result = (await response.json()) as {
        error?: string;
        signedUrl?: string;
      };
      if (!response.ok || !result.signedUrl)
        throw new Error(result.error ?? "자료를 열 수 없습니다.");
      if (popup) popup.location.href = result.signedUrl;
      else window.location.assign(result.signedUrl);
    } catch (error) {
      popup?.close();
      setMessage(
        error instanceof Error ? error.message : "자료를 열 수 없습니다.",
      );
    } finally {
      setPendingId(null);
    }
  }

  async function deleteEvidence(evidenceId: string, filename: string) {
    if (
      !window.confirm(
        `${filename} 파일을 비공개 저장소에서도 삭제할까요? 이 작업은 되돌릴 수 없습니다.`,
      )
    )
      return;
    setPendingId(evidenceId);
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/cases/${caseId}/evidence/${evidenceId}/signed-url`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? "자료를 삭제하지 못했습니다.");
      setMessage("자료를 비공개 저장소와 사건 기록에서 삭제했습니다.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "자료를 삭제하지 못했습니다.",
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <div className="divide-y divide-[var(--navy-300)] border-y border-[var(--navy-300)]">
        {evidence.map((item) => (
          <article
            key={item.id}
            className="grid gap-4 py-5 sm:grid-cols-[auto_1fr_auto] sm:items-center"
          >
            <FileText className="size-5" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {item.original_filename}
              </p>
              <p className="mt-1 text-xs text-[var(--navy-700)]">
                {item.evidence_category} · {formatBytes(item.size_bytes)} ·{" "}
                {new Date(item.created_at).toLocaleDateString("ko-KR")}
              </p>
              {item.customer_description ? (
                <p className="mt-2 text-sm leading-6 text-[var(--navy-700)]">
                  {item.customer_description}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pendingId === item.id}
                onClick={() => openEvidence(item.id)}
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--navy-950)] px-4 text-sm font-bold disabled:opacity-40"
              >
                <ExternalLink className="size-4" />{" "}
                {pendingId === item.id ? "처리 중" : "60초 링크로 열기"}
              </button>
              <button
                type="button"
                disabled={pendingId === item.id}
                onClick={() => deleteEvidence(item.id, item.original_filename)}
                className="inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-bold underline underline-offset-4 disabled:opacity-40"
              >
                <Trash2 className="size-4" /> 삭제
              </button>
            </div>
          </article>
        ))}
        {evidence.length === 0 ? (
          <p className="py-8 text-sm text-[var(--navy-700)]">
            제출된 증빙 자료가 없습니다.
          </p>
        ) : null}
      </div>
      {message ? (
        <p role="status" className="mt-5 text-sm">
          {message}
        </p>
      ) : null}
      <p className="mt-5 text-xs leading-5 text-[var(--navy-700)]">
        첨부파일은 공개 URL을 사용하지 않습니다. 열기 버튼은 60초 동안만 유효한
        서명 링크를 그때 생성합니다.
      </p>
    </div>
  );
}

function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
