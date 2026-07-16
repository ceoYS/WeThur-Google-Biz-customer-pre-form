"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { FactItem } from "@/lib/case-workspace";

const statuses = [
  ["confirmed", "확인됨"],
  ["customer_statement", "고객 진술"],
  ["inference", "추정"],
  ["unknown", "미확인"],
  ["conflicting", "상충됨"],
] as const;

export function FactReviewList({
  caseId,
  facts,
}: {
  caseId: string;
  facts: FactItem[];
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll
    ? facts
    : facts.filter((fact) =>
        ["unknown", "conflicting"].includes(fact.verification_status),
      );
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-black">사실 상태 검토</h3>
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="min-h-11 text-sm font-black underline underline-offset-4"
        >
          {showAll ? "미확인·상충만 보기" : `전체 ${facts.length}개 보기`}
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {visible.map((fact) => (
          <FactReviewItem key={fact.id} caseId={caseId} fact={fact} />
        ))}
        {visible.length === 0 ? (
          <p className="border-l-2 border-[var(--navy-300)] pl-4 text-sm text-[var(--navy-700)]">
            현재 미확인 또는 상충 항목이 없습니다. 전체 보기를 눌러 모든 사실을
            검토할 수 있습니다.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function FactReviewItem({ caseId, fact }: { caseId: string; fact: FactItem }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(
      `/api/admin/cases/${caseId}/facts/${fact.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationStatus: form.get("status"),
          adminNote: form.get("note"),
        }),
      },
    );
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    setMessage(response.ok ? "저장됨" : (result.error ?? "저장 실패"));
    if (response.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className="border border-[var(--navy-300)] p-4">
      <p className="text-xs font-bold text-[var(--navy-700)]">
        {fact.source_type}
      </p>
      <h4 className="mt-1 font-black">{fact.fact_key}</h4>
      <p className="mt-2 text-sm break-words text-[var(--navy-700)]">
        {formatValue(fact.fact_value) || "값 없음"}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
        <label className="text-xs font-bold">
          상태
          <select
            name="status"
            defaultValue={fact.verification_status}
            className="mt-1 min-h-11 w-full border border-[var(--navy-300)] bg-white px-2"
          >
            {statuses.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          관리자 메모
          <input
            name="note"
            defaultValue={fact.admin_note ?? ""}
            className="mt-1 min-h-11 w-full border border-[var(--navy-300)] bg-white px-3 font-normal"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 bg-[var(--navy-950)] px-4 text-sm font-black text-white disabled:opacity-50"
        >
          저장
        </button>
      </div>
      {message ? <p className="mt-2 text-xs font-bold">{message}</p> : null}
    </form>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return String(value);
  return JSON.stringify(value);
}
