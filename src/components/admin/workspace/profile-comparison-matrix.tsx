"use client";

import { useState } from "react";

import {
  formatAdminAnswerValue,
  isAdminAnswerMissing,
} from "@/lib/admin-response-format";
import type {
  CurrentBusiness,
  EvidenceItem,
  HistoryEvent,
  HistorySummary,
  ProfileCandidate,
} from "@/lib/case-workspace";

type MatrixColumn = {
  id: string;
  title: string;
  kind: "official" | "history" | "current";
  values: Record<string, string>;
};

const rows = [
  ["name", "이름"],
  ["sign", "상시 간판명"],
  ["registration", "사업자등록 상호"],
  ["permit", "영업허가명"],
  ["address", "주소"],
  ["floor", "층"],
  ["pin", "지도 핀"],
  ["phone", "전화"],
  ["website", "웹사이트"],
  ["category", "주 카테고리"],
  ["additionalCategories", "추가 카테고리"],
  ["account", "Google 계정"],
  ["creator", "가능한 생성자"],
  ["control", "관리 권한"],
  ["verification", "인증 상태"],
  ["appeal", "이의신청 상태"],
  ["signEvidence", "상시 간판 증빙"],
  ["independence", "사업 독립성 신호"],
] as const;

export function ProfileComparisonMatrix({
  current,
  historySummary,
  historyEvents,
  profiles,
  evidence,
}: {
  current: CurrentBusiness | null;
  historySummary: HistorySummary | null;
  historyEvents: HistoryEvent[];
  profiles: ProfileCandidate[];
  evidence: EvidenceItem[];
}) {
  const [hideEmpty, setHideEmpty] = useState(false);
  const [message, setMessage] = useState("");
  const columns = buildColumns(
    current,
    historySummary,
    historyEvents,
    profiles,
    evidence,
  );
  const visibleColumns = hideEmpty
    ? columns.filter((column) =>
        rows.some(([key]) => hasValue(column.values[key])),
      )
    : columns;

  async function copyMatrix() {
    await navigator.clipboard.writeText(toDelimited(visibleColumns, "\t"));
    setMessage("비교표를 클립보드에 복사했습니다.");
  }

  function downloadCsv() {
    const csv = `\uFEFF${toDelimited(visibleColumns, ",")}`;
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "profile-comparison.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("CSV 파일을 생성했습니다.");
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3 print:hidden">
        <button
          type="button"
          onClick={() => setHideEmpty((value) => !value)}
          className="min-h-11 border border-[var(--navy-300)] px-4 py-2 text-sm font-black"
        >
          {hideEmpty ? "모든 열 보기" : "빈 열 숨기기"}
        </button>
        <button
          type="button"
          onClick={() => void copyMatrix()}
          className="min-h-11 border border-[var(--navy-300)] px-4 py-2 text-sm font-black"
        >
          표 복사
        </button>
        <button
          type="button"
          onClick={downloadCsv}
          className="min-h-11 border border-[var(--navy-300)] px-4 py-2 text-sm font-black"
        >
          CSV 내보내기
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-11 border border-[var(--navy-950)] px-4 py-2 text-sm font-black"
        >
          인쇄
        </button>
        {message ? <span className="text-sm font-bold">{message}</span> : null}
      </div>
      <div className="overflow-x-auto border-y border-[var(--navy-300)]">
        <table className="w-full min-w-[72rem] border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-44 border-r border-[var(--navy-300)] bg-[var(--navy-950)] px-4 py-4 text-white">
                비교 기준
              </th>
              {visibleColumns.map((column) => (
                <th
                  key={column.id}
                  className="min-w-52 border-r border-[var(--navy-300)] bg-[var(--neutral-100)] px-4 py-4 align-top"
                >
                  <span className="text-[0.65rem] font-black tracking-[0.12em] text-[var(--navy-700)] uppercase">
                    {column.kind === "official"
                      ? "공식 사업장"
                      : column.kind === "history"
                        ? "과거 이력"
                        : "현재 후보"}
                  </span>
                  <span className="mt-2 block font-black">{column.title}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, label]) => {
              const values = visibleColumns
                .map((column) => normalize(column.values[key]))
                .filter(Boolean);
              const differs = new Set(values).size > 1;
              return (
                <tr key={key} className="border-t border-[var(--navy-300)]">
                  <th className="sticky left-0 z-10 border-r border-[var(--navy-300)] bg-[var(--neutral-50)] px-4 py-4 font-black">
                    {label}
                  </th>
                  {visibleColumns.map((column) => {
                    const value = column.values[key];
                    return (
                      <td
                        key={column.id}
                        className={`border-r border-[var(--navy-300)] px-4 py-4 align-top break-words ${differs && hasValue(value) ? "border-l-4 border-l-[var(--navy-950)] bg-[var(--neutral-100)] font-black" : "text-[var(--navy-700)]"}`}
                      >
                        {value || "-"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs leading-5 text-[var(--navy-700)]">
        굵은 왼쪽 선은 같은 비교 행에서 확인된 값이 서로 다름을 뜻합니다.
        차이만으로 중복이나 위반을 의미하지 않습니다.
      </p>
    </div>
  );
}

function buildColumns(
  current: CurrentBusiness | null,
  summary: HistorySummary | null,
  history: HistoryEvent[],
  profiles: ProfileCandidate[],
  evidence: EvidenceItem[],
): MatrixColumn[] {
  const signEvidence = evidence.filter(
    (item) => item.evidence_category === "permanent_sign_photo",
  );
  const columns: MatrixColumn[] = [
    {
      id: "official",
      title: "현재 공식 사업장",
      kind: "official",
      values: {
        name: current?.desired_standard_name ?? current?.sign_name ?? "",
        sign: current?.sign_name ?? "",
        registration: current?.registration_name ?? "",
        permit: current?.permit_name ?? "",
        address: current?.official_address ?? "",
        floor: current?.floor_structure ?? "",
        pin: "",
        phone: current?.official_phone ?? "",
        website: current?.official_website ?? "",
        category: current?.primary_activity ?? "",
        additionalCategories: "",
        account: displayValue(
          "old_account_access_status",
          summary?.old_account_access_status,
        ),
        creator: "",
        control: displayValue("authority_status", current?.authority_status),
        verification: "",
        appeal: displayValue("appeal_status", summary?.appeal_status),
        signEvidence: evidenceCount(signEvidence),
        independence: formatSignals(current?.floor_independence_signals),
      },
    },
  ];

  history.forEach((event, index) => {
    columns.push({
      id: `history-${event.id}`,
      title: `과거 ${index + 1} · ${event.profile_name ?? "이름 미확인"}`,
      kind: "history",
      values: {
        name: event.profile_name ?? "",
        sign: "",
        registration: "",
        permit: "",
        address: event.address ?? "",
        floor: event.floor ?? "",
        pin: event.map_pin_notes ?? "",
        phone: event.phone ?? "",
        website: event.website ?? "",
        category: event.primary_category ?? "",
        additionalCategories: stringList(event.additional_categories),
        account: event.account_label ?? "",
        creator: event.handled_by ?? "",
        control: event.ownership_change_notes ?? "",
        verification: [event.verification_method, event.approval_status]
          .filter(Boolean)
          .join(" · "),
        appeal: event.appeal_pending_when_recreated ?? "",
        signEvidence: evidenceCount(
          signEvidence.filter((item) => item.history_event_id === event.id),
        ),
        independence: "",
      },
    });
  });

  profiles.forEach((profile, index) => {
    columns.push({
      id: `profile-${profile.id}`,
      title: `후보 ${index + 1} · ${profile.displayed_name ?? "이름 미확인"}`,
      kind: "current",
      values: {
        name: profile.displayed_name ?? "",
        sign: "",
        registration: "",
        permit: "",
        address: profile.displayed_address ?? "",
        floor: profile.displayed_floor ?? "",
        pin: profile.map_pin_notes ?? "",
        phone: profile.displayed_phone ?? "",
        website: profile.displayed_website ?? "",
        category: profile.displayed_category ?? "",
        additionalCategories: "",
        account: "",
        creator: profile.possible_creator ?? "",
        control: displayValue(
          "customer_controls_profile",
          profile.customer_controls_profile,
        ),
        verification: "",
        appeal: displayValue(
          "ownership_request_status",
          profile.ownership_request_status,
        ),
        signEvidence: evidenceCount(
          signEvidence.filter(
            (item) => item.current_profile_candidate_id === profile.id,
          ),
        ),
        independence: formatSignals(profile.independent_business_signals),
      },
    });
  });
  return columns;
}

function toDelimited(columns: MatrixColumn[], delimiter: "\t" | ",") {
  const lines = [
    ["비교 기준", ...columns.map((column) => column.title)],
    ...rows.map(([key, label]) => [
      label,
      ...columns.map((column) => column.values[key] || ""),
    ]),
  ];
  return lines
    .map((line) =>
      line.map((cell) => escapeCell(cell, delimiter)).join(delimiter),
    )
    .join("\n");
}

function escapeCell(value: string, delimiter: "\t" | ",") {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (delimiter === "\t")
    return safe.replaceAll("\t", " ").replaceAll("\n", " ");
  return `"${safe.replaceAll('"', '""')}"`;
}

function evidenceCount(items: EvidenceItem[]) {
  return items.length ? `${items.length}개 자료` : "";
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .join(", ")
    : "";
}

function formatSignals(value: unknown) {
  return isAdminAnswerMissing(value)
    ? ""
    : formatAdminAnswerValue("independent_business_signals", value);
}

function displayValue(key: string, value: unknown) {
  return isAdminAnswerMissing(value) ? "" : formatAdminAnswerValue(key, value);
}

function normalize(value: string | undefined) {
  const normalized = value?.trim().toLocaleLowerCase("ko-KR") ?? "";
  return ["", "-", "미확인", "unknown"].includes(normalized) ? "" : normalized;
}

function hasValue(value: string | undefined) {
  return Boolean(normalize(value));
}
