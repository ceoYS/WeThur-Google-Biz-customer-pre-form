"use client";

import { FileText, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import type {
  PublicEvidenceFile,
  PublicRequestedEvidence,
} from "@/lib/public-intake";
import type { IntakePayloadInput } from "@/lib/schemas/intake";

const inputClass =
  "min-h-12 w-full border border-[var(--navy-300)] bg-white px-3 text-sm";

export function EvidenceUploader({
  token,
  requestedEvidence,
  initialFiles,
}: {
  token: string;
  requestedEvidence: PublicRequestedEvidence[];
  initialFiles: PublicEvidenceFile[];
}) {
  const { control } = useFormContext<IntakePayloadInput>();
  const historyEvents = useWatch({ control, name: "historyEvents" }) ?? [];
  const profiles = useWatch({ control, name: "profileCandidates" }) ?? [];
  const [files, setFiles] = useState(initialFiles);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState(
    requestedEvidence[0]?.category ?? "other",
  );
  const [description, setDescription] = useState("");
  const [linkReference, setLinkReference] = useState("");
  const [inputKey, setInputKey] = useState(0);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const categoryLabels = new Map(
    requestedEvidence.map((item) => [item.category, item.label]),
  );

  async function uploadFile() {
    if (!selectedFile) {
      setMessage("업로드할 파일을 선택해주세요.");
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.set("file", selectedFile);
      formData.set("evidenceCategory", category);
      formData.set("customerDescription", description);
      if (linkReference) {
        const separator = linkReference.indexOf(":");
        formData.set("linkType", linkReference.slice(0, separator));
        formData.set("linkClientId", linkReference.slice(separator + 1));
      }
      const response = await fetch(`/api/intake/${token}/evidence`, {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        error?: string;
        evidence?: PublicEvidenceFile;
      };
      if (!response.ok || !result.evidence)
        throw new Error(result.error ?? "파일을 업로드하지 못했습니다.");
      setFiles((current) => [...current, result.evidence!]);
      setSelectedFile(null);
      setDescription("");
      setLinkReference("");
      setInputKey((value) => value + 1);
      setMessage("자료를 비공개 저장소에 안전하게 업로드했습니다.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "파일을 업로드하지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  async function deleteFile(id: string) {
    if (!window.confirm("최종 제출 전에 이 자료를 삭제할까요?")) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/intake/${token}/evidence/${id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? "자료를 삭제하지 못했습니다.");
      setFiles((current) => current.filter((file) => file.id !== id));
      setMessage("자료를 삭제했습니다.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "자료를 삭제하지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-black tracking-[-0.03em]">요청드리는 자료</h3>
      <p className="mt-3 text-sm leading-7 text-[var(--navy-700)]">
        자료가 지금 없으면 나중에 확인해도 괜찮습니다. 주민등록번호, 전체 결제
        정보, 가리지 않은 신분증은 보내지 마세요. Google 비밀번호, OTP,
        복구코드는 어떤 경우에도 업로드하지 마세요.
      </p>
      <ul className="mt-5 divide-y divide-[var(--navy-300)] border-y border-[var(--navy-300)]">
        {requestedEvidence.map((item) => (
          <li key={item.category} className="flex gap-4 py-4 text-sm">
            <span className="font-bold">{item.label}</span>
            {item.required ? (
              <span className="text-xs text-[var(--navy-700)]">우선 확인</span>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-8 border border-[var(--navy-300)] bg-[var(--neutral-100)] p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold">
            <span className="mb-2 block">자료 분류</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={inputClass}
            >
              {requestedEvidence.map((item) => (
                <option key={item.category} value={item.category}>
                  {item.label}
                </option>
              ))}
              <option value="other">기타 확인 자료</option>
            </select>
          </label>
          <label className="block text-sm font-bold">
            <span className="mb-2 block">연결할 이력 또는 프로필 (선택)</span>
            <select
              value={linkReference}
              onChange={(event) => setLinkReference(event.target.value)}
              className={inputClass}
            >
              <option value="">사건 전체 자료</option>
              {historyEvents.map((event, index) => (
                <option
                  key={event.clientId}
                  value={`history_event:${event.clientId}`}
                >
                  과거 이력 {index + 1}:{" "}
                  {event.profileName ||
                    event.approximatePeriod ||
                    "이름 미입력"}
                </option>
              ))}
              {profiles.map((profile, index) => (
                <option
                  key={profile.clientId}
                  value={`profile_candidate:${profile.clientId}`}
                >
                  현재 프로필 {index + 1}:{" "}
                  {profile.displayedName || "이름 미입력"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-4 block text-sm font-bold">
          <span className="mb-2 block">파일</span>
          <input
            key={inputKey}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
            onChange={(event) =>
              setSelectedFile(event.target.files?.[0] ?? null)
            }
            className="min-h-14 w-full border border-dashed border-[var(--navy-950)] bg-white p-3 text-sm file:mr-4 file:border-0 file:bg-[var(--navy-950)] file:px-4 file:py-2 file:font-bold file:text-white"
          />
        </label>
        <label className="mt-4 block text-sm font-bold">
          <span className="mb-2 block">자료 설명 (선택)</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={2000}
            className={`${inputClass} py-3`}
            placeholder="어떤 내용을 확인할 수 있는 자료인지 알려주세요."
          />
        </label>
        <p className="mt-4 text-xs leading-5 text-[var(--navy-700)]">
          JPG, PNG, WebP, PDF · 파일당 15 MB · 전체 15개. 불필요한 개인정보는
          가려주세요.
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--navy-700)]">
          업로드한 자료는 외부에 공개되지 않으며, 해당 사건 검토 목적으로만
          사용됩니다.
        </p>
        <button
          type="button"
          disabled={pending || files.length >= 15}
          onClick={uploadFile}
          className="mt-5 inline-flex min-h-12 items-center gap-2 bg-[var(--navy-950)] px-5 text-sm font-bold text-white disabled:opacity-50"
        >
          <Upload className="size-4" />{" "}
          {pending ? "처리 중" : "자료 안전하게 업로드"}
        </button>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h4 className="font-black">업로드한 자료</h4>
          <span className="text-xs font-bold text-[var(--navy-700)]">
            {files.length} / 15
          </span>
        </div>
        <ul className="mt-4 divide-y divide-[var(--navy-300)] border-y border-[var(--navy-300)]">
          {files.map((file) => (
            <li key={file.id} className="flex items-center gap-4 py-4">
              <FileText className="size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {file.originalFilename}
                </p>
                <p className="mt-1 text-xs text-[var(--navy-700)]">
                  {categoryLabels.get(file.category) ?? file.category} ·{" "}
                  {formatSize(file.sizeBytes)}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => deleteFile(file.id)}
                className="flex min-h-11 items-center gap-2 px-2 text-xs font-bold text-[var(--navy-700)] disabled:opacity-40"
              >
                <Trash2 className="size-4" /> 삭제
              </button>
            </li>
          ))}
          {files.length === 0 ? (
            <li className="py-6 text-sm text-[var(--navy-700)]">
              아직 업로드한 자료가 없습니다.
            </li>
          ) : null}
        </ul>
      </div>
      {message ? (
        <p
          role="status"
          className="mt-5 border-l-2 border-[var(--navy-950)] pl-4 text-sm leading-6"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
