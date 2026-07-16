"use client";

import { useState, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { HistoryEvent } from "@/lib/case-workspace";

const shortFields = [
  ["approximate_period", "대략적인 시기"],
  ["handled_by", "담당자·대행사"],
  ["handler_type", "담당 유형"],
  ["account_label", "계정 라벨"],
  ["profile_name", "프로필 이름"],
  ["address", "주소"],
  ["floor", "층"],
  ["phone", "전화"],
  ["website", "웹사이트"],
  ["primary_category", "주 카테고리"],
  ["verification_method", "인증 방식"],
  ["approval_status", "승인 상태"],
  ["appeal_pending_when_recreated", "재생성 당시 이의신청"],
  ["same_account_other_suspensions", "같은 계정의 다른 정지 단서"],
] as const;

const longFields = [
  ["map_pin_notes", "지도 핀 메모"],
  ["final_result", "최종 결과"],
  ["google_message", "기억나는 Google 안내"],
  ["changes_before_result", "결과 전에 달라진 정보"],
  ["ownership_change_notes", "소유권·관리자 변경 메모"],
  ["evidence_notes", "고객이 남긴 증빙 메모"],
  ["admin_normalization_note", "관리자 정규화 메모"],
] as const;

export function TimelineWorkspace({
  caseId,
  initialEvents,
}: {
  caseId: string;
  initialEvents: HistoryEvent[];
}) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function persistOrder(next: HistoryEvent[]) {
    setEvents(next);
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/admin/cases/${caseId}/history/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventIds: next.map((event) => event.id) }),
    });
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setEvents(initialEvents);
      setMessage(result.error ?? "순서를 변경하지 못했습니다.");
      return;
    }
    setMessage("순서를 저장했습니다.");
    router.refresh();
  }

  function move(index: number, offset: number) {
    const target = index + offset;
    if (target < 0 || target >= events.length || busy) return;
    const next = [...events];
    const [event] = next.splice(index, 1);
    if (!event) return;
    next.splice(target, 0, event);
    void persistOrder(next);
  }

  function drop(event: DragEvent<HTMLElement>, targetId: string) {
    event.preventDefault();
    if (!draggedId || draggedId === targetId || busy) return;
    const next = [...events];
    const from = next.findIndex((item) => item.id === draggedId);
    const to = next.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const [dragged] = next.splice(from, 1);
    if (!dragged) return;
    next.splice(to, 0, dragged);
    setDraggedId(null);
    void persistOrder(next);
  }

  async function addEvent() {
    if (events.length >= 10 || busy) return;
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/admin/cases/${caseId}/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    setMessage(
      response.ok
        ? "빈 이력을 추가했습니다."
        : (result.error ?? "추가하지 못했습니다."),
    );
    if (response.ok) router.refresh();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[var(--navy-700)]">
          카드를 끌거나 화살표로 순서를 바꿀 수 있습니다. 고객 원본은 수정되지
          않습니다.
        </p>
        <button
          type="button"
          onClick={addEvent}
          disabled={busy || events.length >= 10}
          className="min-h-11 border border-[var(--navy-950)] px-4 py-2 text-sm font-black disabled:opacity-40"
        >
          이력 추가 {events.length}/10
        </button>
      </div>
      {message ? <p className="mb-5 text-sm font-bold">{message}</p> : null}
      <div className="space-y-4">
        {events.map((event, index) => (
          <article
            key={event.id}
            draggable={!busy}
            onDragStart={() => setDraggedId(event.id)}
            onDragOver={(dragEvent) => dragEvent.preventDefault()}
            onDrop={(dragEvent) => drop(dragEvent, event.id)}
            className="border border-[var(--navy-300)] bg-[var(--neutral-50)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--navy-300)] px-5 py-4">
              <div>
                <p className="text-xs font-black text-[var(--navy-700)]">
                  EVENT {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-1 font-black">
                  {event.approximate_period ?? "시기 미확인"} ·{" "}
                  {event.profile_name ?? "프로필명 미확인"}
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="앞으로 이동"
                  onClick={() => move(index, -1)}
                  disabled={busy || index === 0}
                  className="min-h-11 min-w-11 border border-[var(--navy-300)] font-black disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="뒤로 이동"
                  onClick={() => move(index, 1)}
                  disabled={busy || index === events.length - 1}
                  className="min-h-11 min-w-11 border border-[var(--navy-300)] font-black disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
            </div>
            <TimelineEventEditor caseId={caseId} event={event} />
          </article>
        ))}
        {events.length === 0 ? (
          <p className="border-l-2 border-[var(--navy-300)] pl-4 text-sm text-[var(--navy-700)]">
            등록된 과거 이력이 없습니다.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function TimelineEventEditor({
  caseId,
  event,
}: {
  caseId: string;
  event: HistoryEvent;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(formEvent.currentTarget);
    const payload = Object.fromEntries(
      [...shortFields, ...longFields].map(([key]) => [
        key,
        String(form.get(key) ?? ""),
      ]),
    );
    const categories = String(form.get("additional_categories") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const response = await fetch(
      `/api/admin/cases/${caseId}/history/${event.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, additional_categories: categories }),
      },
    );
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    setMessage(
      response.ok
        ? "정규화 정보를 저장했습니다."
        : (result.error ?? "저장하지 못했습니다."),
    );
    if (response.ok) router.refresh();
  }

  return (
    <div className="p-5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="min-h-11 text-sm font-black underline underline-offset-4"
      >
        {open ? "상세 편집 닫기" : "정규화 정보와 원본 보기"}
      </button>
      {open ? (
        <form onSubmit={save} className="mt-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shortFields.map(([key, label]) => (
              <label key={key} className="text-sm font-bold">
                {label}
                <input
                  name={key}
                  defaultValue={event[key] ?? ""}
                  className="mt-2 min-h-11 w-full border border-[var(--navy-300)] bg-white px-3 py-2 font-normal"
                />
              </label>
            ))}
            <label className="text-sm font-bold sm:col-span-2 lg:col-span-3">
              추가 카테고리, 쉼표로 구분
              <input
                name="additional_categories"
                defaultValue={asStringArray(event.additional_categories).join(
                  ", ",
                )}
                className="mt-2 min-h-11 w-full border border-[var(--navy-300)] bg-white px-3 py-2 font-normal"
              />
            </label>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {longFields.map(([key, label]) => (
              <label key={key} className="text-sm font-bold">
                {label}
                <textarea
                  name={key}
                  defaultValue={event[key] ?? ""}
                  rows={3}
                  className="mt-2 w-full border border-[var(--navy-300)] bg-white px-3 py-2 font-normal"
                />
              </label>
            ))}
          </div>
          <details className="mt-6 border-y border-[var(--navy-300)] py-4">
            <summary className="cursor-pointer text-sm font-black">
              고객 원본 응답 보기 (읽기 전용)
            </summary>
            <pre className="mt-4 overflow-x-auto text-xs leading-6 whitespace-pre-wrap text-[var(--navy-700)]">
              {JSON.stringify(event.customer_raw_response, null, 2)}
            </pre>
          </details>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 bg-[var(--navy-950)] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {busy ? "저장 중" : "정규화 정보 저장"}
            </button>
            {message ? (
              <span className="text-sm font-bold">{message}</span>
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
