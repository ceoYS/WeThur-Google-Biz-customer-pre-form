"use client";

import { RotateCcw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  caseStatusLabels,
  getAllowedCaseStatuses,
  type CaseStatus,
} from "@/lib/case-status";

export function CaseOperations({
  caseId,
  currentStatus,
  intakeStatus,
  retentionReviewAt,
}: {
  caseId: string;
  currentStatus: CaseStatus;
  intakeStatus: string;
  retentionReviewAt: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [noteType, setNoteType] = useState("general");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [retentionDate, setRetentionDate] = useState(
    retentionReviewAt?.slice(0, 10) ?? "",
  );

  async function changeStatus(nextStatus: CaseStatus) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? "상태를 변경하지 못했습니다.");
      setStatus(nextStatus);
      setMessage("사건 상태를 변경했습니다.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "상태를 변경하지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  async function addNote() {
    if (!note.trim()) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/cases/${caseId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteType, content: note }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? "메모를 저장하지 못했습니다.");
      setNote("");
      setMessage("진행 메모를 저장했습니다.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "메모를 저장하지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  async function reopen() {
    if (
      !window.confirm(
        "고객이 같은 링크로 답변을 수정하고 다시 제출할 수 있게 할까요?",
      )
    )
      return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/cases/${caseId}/reopen`, {
        method: "POST",
      });
      const result = (await response.json()) as {
        error?: string;
        needsNewToken?: boolean;
      };
      if (!response.ok)
        throw new Error(result.error ?? "고객 작성을 다시 열지 못했습니다.");
      setMessage(
        result.needsNewToken
          ? "작성을 다시 열었습니다. 고객 링크가 해지되어 새 링크 생성도 필요합니다."
          : "고객 작성을 다시 열었습니다.",
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "고객 작성을 다시 열지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  async function saveRetentionDate() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/cases/${caseId}/retention`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewDate: retentionDate }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? "보관 검토일을 저장하지 못했습니다.");
      setMessage("보관 검토일을 저장했습니다. 자동 삭제일이 아닙니다.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "보관 검토일을 저장하지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="grid gap-5 border-y border-[var(--navy-300)] py-6 lg:grid-cols-[16rem_1fr_auto] lg:items-end">
      <label className="block text-sm font-bold">
        <span className="mb-2 block">사건 상태</span>
        <select
          value={status}
          disabled={pending}
          onChange={(event) => changeStatus(event.target.value as CaseStatus)}
          className="min-h-12 w-full border border-[var(--navy-300)] bg-white px-3 text-sm"
        >
          {getAllowedCaseStatuses(status).map((value) => (
            <option key={value} value={value}>
              {caseStatusLabels[value]}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr_auto]">
        <select
          value={noteType}
          onChange={(event) => setNoteType(event.target.value)}
          className="min-h-12 border border-[var(--navy-300)] bg-white px-3 text-sm"
        >
          <option value="general">일반 메모</option>
          <option value="review">검토</option>
          <option value="customer_contact">고객 연락</option>
          <option value="decision">결정</option>
          <option value="risk">위험</option>
        </select>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={10000}
          placeholder="진행 메모를 남겨주세요."
          className="min-h-12 border border-[var(--navy-300)] bg-white px-3 text-sm"
        />
        <button
          type="button"
          disabled={pending || !note.trim()}
          onClick={addNote}
          className="inline-flex min-h-12 items-center justify-center gap-2 bg-[var(--navy-950)] px-4 text-sm font-bold text-white disabled:opacity-40"
        >
          <Save className="size-4" /> 저장
        </button>
      </div>
      {intakeStatus === "submitted" ? (
        <button
          type="button"
          disabled={pending}
          onClick={reopen}
          className="inline-flex min-h-12 items-center justify-center gap-2 border border-[var(--navy-950)] px-4 text-sm font-bold disabled:opacity-40"
        >
          <RotateCcw className="size-4" /> 고객 작성 다시 열기
        </button>
      ) : (
        <span className="text-xs text-[var(--navy-700)]">
          작성 상태: {intakeStatus}
        </span>
      )}
      {message ? (
        <p role="status" className="text-sm leading-6 lg:col-span-3">
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap items-end gap-3 border-t border-[var(--navy-300)] pt-5 lg:col-span-3">
        <label className="text-xs font-bold">
          보관 필요성 검토일
          <input
            type="date"
            value={retentionDate}
            onChange={(event) => setRetentionDate(event.target.value)}
            className="mt-2 min-h-11 border border-[var(--navy-300)] bg-white px-3 text-sm font-normal"
          />
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={saveRetentionDate}
          className="min-h-11 border border-[var(--navy-950)] px-4 text-sm font-black disabled:opacity-50"
        >
          검토일 저장
        </button>
        <p className="text-xs leading-5 text-[var(--navy-700)]">
          자동 삭제가 아니라 완료 후 보관 필요성을 검토할 날짜입니다.
        </p>
      </div>
    </section>
  );
}
