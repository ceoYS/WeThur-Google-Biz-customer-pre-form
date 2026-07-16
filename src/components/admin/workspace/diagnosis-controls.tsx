"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const paths = [
  ["", "아직 결정하지 않음"],
  ["A", "A. 기존 프로필 복구"],
  ["B", "B. 기존 프로필 소유권 요청"],
  ["C", "C. 중복 및 정보 정리"],
  ["D", "D. 공식 이의신청 또는 재검토"],
  ["E", "E. 등록정보 수정"],
  ["F", "F. 정책상 가능한 경우 신규 등록"],
  ["G", "G. 추가 자료 확인 후 보류"],
  ["H", "H. 지원 범위 외 또는 진행 중단"],
] as const;

export function DiagnosisControls({
  caseId,
  decisionPath,
  conclusion,
}: {
  caseId: string;
  decisionPath: string | null;
  conclusion: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function regenerate() {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/admin/cases/${caseId}/diagnosis`, {
      method: "POST",
    });
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    setMessage(
      response.ok
        ? "최신 제출 자료로 가설을 다시 생성했습니다."
        : (result.error ?? "생성하지 못했습니다."),
    );
    if (response.ok) router.refresh();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const path = String(form.get("path") ?? "");
    const response = await fetch(`/api/admin/cases/${caseId}/diagnosis`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminDecisionPath: path || null,
        adminConclusion: String(form.get("conclusion") ?? ""),
      }),
    });
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    setMessage(
      response.ok
        ? "관리자 결정을 저장했습니다."
        : (result.error ?? "저장하지 못했습니다."),
    );
    if (response.ok) router.refresh();
  }

  return (
    <div className="mt-10 border-t border-[var(--navy-300)] pt-8 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-black">관리자 검토</h3>
          <p className="mt-1 text-sm text-[var(--navy-700)]">
            가설은 다시 계산할 수 있지만 최종 경로는 자동 선택되지 않습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={regenerate}
          disabled={busy}
          className="min-h-11 border border-[var(--navy-950)] px-4 py-2 text-sm font-black disabled:opacity-50"
        >
          진단 다시 생성
        </button>
      </div>
      <form
        onSubmit={save}
        className="mt-6 grid gap-4 lg:grid-cols-[18rem_1fr_auto] lg:items-end"
      >
        <label className="text-sm font-bold">
          최종 결정 경로
          <select
            name="path"
            defaultValue={decisionPath ?? ""}
            className="mt-2 min-h-11 w-full border border-[var(--navy-300)] bg-white px-3 py-2"
          >
            {paths.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          관리자 결론
          <textarea
            name="conclusion"
            defaultValue={conclusion ?? ""}
            rows={3}
            className="mt-2 w-full border border-[var(--navy-300)] bg-white px-3 py-2 font-normal"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 bg-[var(--navy-950)] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
        >
          결정 저장
        </button>
      </form>
      {message ? <p className="mt-4 text-sm font-bold">{message}</p> : null}
    </div>
  );
}
