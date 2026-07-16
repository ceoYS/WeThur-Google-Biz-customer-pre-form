"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

import {
  createEmptyProfileCandidate,
  type IntakePayloadInput,
} from "@/lib/schemas/intake";

const inputClass =
  "min-h-12 w-full border border-[var(--navy-300)] bg-white px-3 text-sm";
const signals = [
  ["entrance", "별도 출입구"],
  ["permanent_sign", "별도 상시 간판"],
  ["employees", "별도 직원"],
  ["register", "별도 계산대"],
  ["phone", "별도 전화"],
  ["website", "별도 웹사이트"],
  ["operating_permit", "별도 영업허가"],
] as const;

export function ProfileCandidateList() {
  const { control, register } = useFormContext<IntakePayloadInput>();
  const profiles = useFieldArray({ control, name: "profileCandidates" });

  return (
    <div className="mt-10 space-y-4">
      {profiles.fields.map((field, index) => (
        <ProfileCard
          key={field.id}
          index={index}
          prefilled={Boolean(field.existingId)}
          onRemove={() => profiles.remove(index)}
          register={register}
        />
      ))}
      <button
        type="button"
        disabled={profiles.fields.length >= 10}
        onClick={() => profiles.append(createEmptyProfileCandidate())}
        className="inline-flex min-h-12 items-center gap-2 border-b border-[var(--navy-950)] text-sm font-bold disabled:opacity-40"
      >
        <Plus className="size-4" /> 다른 프로필 후보 추가
      </button>
    </div>
  );
}

function ProfileCard({
  index,
  prefilled,
  onRemove,
  register,
}: {
  index: number;
  prefilled: boolean;
  onRemove: () => void;
  register: ReturnType<typeof useFormContext<IntakePayloadInput>>["register"];
}) {
  const [expanded, setExpanded] = useState(prefilled);
  return (
    <article className="border border-[var(--navy-300)] bg-[var(--neutral-50)] p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[var(--navy-700)] uppercase">
            {prefilled ? "현재 관련 프로필 후보" : "추가한 프로필 후보"}
          </p>
          <h3 className="mt-2 font-black">확인 항목 {index + 1}</h3>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex min-h-11 items-center gap-2 px-2 text-xs font-bold text-[var(--navy-700)]"
        >
          <Trash2 className="size-4" /> 삭제
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Google Maps 공유 링크">
          <input
            {...register(`profileCandidates.${index}.mapsUrl`)}
            className={inputClass}
          />
        </Field>
        <Field label="표시된 업체명">
          <input
            {...register(`profileCandidates.${index}.displayedName`)}
            className={inputClass}
          />
        </Field>
        <Field label="표시된 주소">
          <input
            {...register(`profileCandidates.${index}.displayedAddress`)}
            className={inputClass}
          />
        </Field>
        <Field label="표시된 층">
          <input
            {...register(`profileCandidates.${index}.displayedFloor`)}
            className={inputClass}
          />
        </Field>
        <Field label="대표님이 직접 관리할 수 있나요?">
          <select
            {...register(`profileCandidates.${index}.customerControlsProfile`)}
            className={inputClass}
          >
            <option value="">선택해주세요</option>
            <option value="yes">관리할 수 있어요</option>
            <option value="no">관리할 수 없어요</option>
            <option value="unknown">잘 모르겠어요</option>
            <option value="needs_confirmation">확인이 필요해요</option>
          </select>
        </Field>
        <Field label="소유권 요청 상태">
          <select
            {...register(`profileCandidates.${index}.ownershipRequestStatus`)}
            className={inputClass}
          >
            <option value="">선택해주세요</option>
            <option value="possible">요청할 수 있어 보여요</option>
            <option value="requested">요청했어요</option>
            <option value="approved">승인됐어요</option>
            <option value="rejected">거절됐어요</option>
            <option value="unknown">잘 모르겠어요</option>
          </select>
        </Field>
      </div>
      <Field label="같은 사업장이라고 생각하는 이유">
        <textarea
          {...register(`profileCandidates.${index}.relationNotes`)}
          rows={3}
          className={`${inputClass} mt-2 py-3`}
        />
      </Field>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mt-5 min-h-11 border-b border-[var(--navy-950)] text-sm font-bold"
      >
        {expanded ? "상세 정보 접기" : "표시 정보와 독립 운영 여부 더 확인하기"}
      </button>
      {expanded ? (
        <div className="mt-6 border-t border-[var(--navy-300)] pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="표시 전화">
              <input
                {...register(`profileCandidates.${index}.displayedPhone`)}
                className={inputClass}
              />
            </Field>
            <Field label="표시 웹사이트">
              <input
                {...register(`profileCandidates.${index}.displayedWebsite`)}
                className={inputClass}
              />
            </Field>
            <Field label="표시 카테고리">
              <input
                {...register(`profileCandidates.${index}.displayedCategory`)}
                className={inputClass}
              />
            </Field>
            <Field label="가능한 생성자">
              <input
                {...register(`profileCandidates.${index}.possibleCreator`)}
                className={inputClass}
                placeholder="대행사, 직원, 잘 모름 등"
              />
            </Field>
            <Field label="평점">
              <input
                {...register(`profileCandidates.${index}.rating`)}
                type="number"
                min={0}
                max={5}
                step="0.1"
                className={inputClass}
              />
            </Field>
            <Field label="리뷰 수">
              <input
                {...register(`profileCandidates.${index}.reviewCount`)}
                type="number"
                min={0}
                className={inputClass}
              />
            </Field>
            <Field label="지도 핀 메모">
              <textarea
                {...register(`profileCandidates.${index}.mapPinNotes`)}
                rows={3}
                className={`${inputClass} py-3`}
              />
            </Field>
          </div>
          <h4 className="mt-7 text-sm font-black">
            이 프로필이 별도 사업장이라면 갖고 있는 항목
          </h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {signals.map(([key, label]) => (
              <Field key={key} label={label}>
                <select
                  {...register(
                    `profileCandidates.${index}.independentBusinessSignals.${key}`,
                  )}
                  className={inputClass}
                >
                  <option value="needs_confirmation">확인이 필요해요</option>
                  <option value="yes">있어요</option>
                  <option value="no">없어요</option>
                  <option value="unknown">잘 모르겠어요</option>
                  <option value="not_applicable">해당 없음</option>
                </select>
              </Field>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-4 block text-sm font-bold first:mt-0">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}
