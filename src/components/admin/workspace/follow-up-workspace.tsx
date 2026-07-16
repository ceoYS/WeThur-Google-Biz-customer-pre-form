"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { FollowUp } from "@/lib/case-workspace";
import {
  followUpStatusLabels,
  getAllowedFollowUpStatuses,
  type FollowUpStatus,
} from "@/lib/follow-up-status";

type SuggestedQuestion = {
  key: string;
  title: string;
  message: string;
  requestedItems: string[];
};

export function FollowUpWorkspace({
  caseId,
  suggestedQuestions,
  followUps,
}: {
  caseId: string;
  suggestedQuestions: unknown;
  followUps: FollowUp[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const suggestions = parseSuggestions(suggestedQuestions);

  async function create(question: SuggestedQuestion) {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/admin/cases/${caseId}/follow-ups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: question.title,
        message: question.message,
        requestedItems: question.requestedItems,
      }),
    });
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    setMessage(
      response.ok
        ? "추가 질문 초안을 만들었습니다."
        : (result.error ?? "초안을 만들지 못했습니다."),
    );
    if (response.ok) router.refresh();
  }

  async function createCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await create({
      key: "custom",
      title: String(form.get("title") ?? ""),
      message: String(form.get("message") ?? ""),
      requestedItems: String(form.get("items") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
    if (event.currentTarget.isConnected) event.currentTarget.reset();
  }

  return (
    <div>
      {suggestions.length ? (
        <section>
          <h3 className="font-black">자동 제안 질문</h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {suggestions.map((question) => (
              <article
                key={question.key}
                className="border border-[var(--navy-300)] p-5"
              >
                <h4 className="font-black">{question.title}</h4>
                <p className="mt-3 text-sm leading-7 whitespace-pre-line text-[var(--navy-700)]">
                  {question.message}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void copyText(question.message, setMessage)}
                    className="min-h-11 border border-[var(--navy-300)] px-4 text-sm font-black"
                  >
                    메시지 복사
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void create(question)}
                    className="min-h-11 bg-[var(--navy-950)] px-4 text-sm font-black text-white disabled:opacity-50"
                  >
                    요청 초안 만들기
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-12">
        <h3 className="font-black">저장된 추가 질문</h3>
        <div className="mt-4 space-y-4">
          {followUps.map((followUp) => (
            <FollowUpItem
              key={followUp.id}
              caseId={caseId}
              followUp={followUp}
              onMessage={setMessage}
            />
          ))}
          {followUps.length === 0 ? (
            <p className="border-l-2 border-[var(--navy-300)] pl-4 text-sm text-[var(--navy-700)]">
              아직 저장된 추가 질문이 없습니다.
            </p>
          ) : null}
        </div>
      </section>

      <form
        onSubmit={createCustom}
        className="mt-12 border-t border-[var(--navy-300)] pt-8"
      >
        <h3 className="font-black">직접 질문 만들기</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="text-sm font-bold">
            제목
            <input
              name="title"
              required
              maxLength={300}
              className="mt-2 min-h-11 w-full border border-[var(--navy-300)] bg-white px-3 font-normal"
            />
          </label>
          <label className="text-sm font-bold">
            요청 항목, 쉼표로 구분
            <input
              name="items"
              maxLength={2000}
              className="mt-2 min-h-11 w-full border border-[var(--navy-300)] bg-white px-3 font-normal"
            />
          </label>
          <label className="text-sm font-bold lg:col-span-2">
            고객에게 보낼 쉬운 문장
            <textarea
              name="message"
              required
              maxLength={5000}
              rows={4}
              className="mt-2 w-full border border-[var(--navy-300)] bg-white px-3 py-2 font-normal"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="mt-4 min-h-11 bg-[var(--navy-950)] px-5 text-sm font-black text-white disabled:opacity-50"
        >
          질문 초안 저장
        </button>
      </form>
      {message ? (
        <p role="status" className="mt-5 text-sm font-bold">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function FollowUpItem({
  caseId,
  followUp,
  onMessage,
}: {
  caseId: string;
  followUp: FollowUp;
  onMessage: (message: string) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const currentStatus = isStatus(followUp.status) ? followUp.status : "draft";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    onMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(
      `/api/admin/cases/${caseId}/follow-ups/${followUp.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: form.get("status"),
          customerResponse: form.get("response"),
        }),
      },
    );
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    onMessage(
      response.ok
        ? "추가 질문 상태를 저장했습니다."
        : (result.error ?? "저장하지 못했습니다."),
    );
    if (response.ok) router.refresh();
  }

  return (
    <article className="border border-[var(--navy-300)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-[var(--navy-700)]">
            {followUpStatusLabels[currentStatus]}
          </p>
          <h4 className="mt-2 font-black">{followUp.title}</h4>
        </div>
        <button
          type="button"
          onClick={() => void copyText(followUp.message, onMessage)}
          className="min-h-11 border border-[var(--navy-300)] px-4 text-sm font-black"
        >
          메시지 복사
        </button>
      </div>
      <p className="mt-4 text-sm leading-7 whitespace-pre-line text-[var(--navy-700)]">
        {followUp.message}
      </p>
      <form
        onSubmit={save}
        className="mt-5 grid gap-4 lg:grid-cols-[13rem_1fr_auto] lg:items-end"
      >
        <label className="text-xs font-bold">
          상태
          <select
            name="status"
            defaultValue={currentStatus}
            className="mt-1 min-h-11 w-full border border-[var(--navy-300)] bg-white px-3"
          >
            {getAllowedFollowUpStatuses(currentStatus).map((status) => (
              <option key={status} value={status}>
                {followUpStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          고객 회신
          <textarea
            name="response"
            defaultValue={followUp.customer_response ?? ""}
            rows={3}
            className="mt-1 w-full border border-[var(--navy-300)] bg-white px-3 py-2 font-normal"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 bg-[var(--navy-950)] px-5 text-sm font-black text-white disabled:opacity-50"
        >
          상태 저장
        </button>
      </form>
    </article>
  );
}

async function copyText(value: string, onMessage: (message: string) => void) {
  try {
    await navigator.clipboard.writeText(value);
    onMessage("메시지를 클립보드에 복사했습니다.");
  } catch {
    onMessage("브라우저에서 복사 권한을 허용한 뒤 다시 시도해주세요.");
  }
}

function parseSuggestions(value: unknown): SuggestedQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    if (
      typeof record.key !== "string" ||
      typeof record.title !== "string" ||
      typeof record.message !== "string"
    )
      return [];
    return [
      {
        key: record.key,
        title: record.title,
        message: record.message,
        requestedItems: Array.isArray(record.requestedItems)
          ? record.requestedItems.filter(
              (entry): entry is string => typeof entry === "string",
            )
          : [],
      },
    ];
  });
}

function isStatus(value: string): value is FollowUpStatus {
  return value in followUpStatusLabels;
}
