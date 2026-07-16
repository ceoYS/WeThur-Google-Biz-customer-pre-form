"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";

import {
  createEmptyThirdParty,
  type IntakePayloadInput,
} from "@/lib/schemas/intake";

const inputClass =
  "min-h-12 w-full border border-[var(--navy-300)] bg-white px-3 text-sm";

export function ThirdPartyList() {
  const { control, register } = useFormContext<IntakePayloadInput>();
  const parties = useFieldArray({ control, name: "thirdParties" });
  return (
    <div className="mt-10">
      <h3 className="text-xl font-black tracking-[-0.03em]">
        당시 진행을 도운 분
      </h3>
      <p className="mt-2 text-sm leading-6 text-[var(--navy-700)]">
        잘못을 판단하려는 질문이 아닙니다. 누가 어떤 작업을 맡았는지 흐름만
        확인합니다.
      </p>
      <div className="mt-5 space-y-4">
        {parties.fields.map((field, index) => (
          <article
            key={field.id}
            className="border border-[var(--navy-300)] bg-[var(--neutral-50)] p-5 sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <h4 className="font-black">담당자 {index + 1}</h4>
              <button
                type="button"
                onClick={() => parties.remove(index)}
                className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-[var(--navy-700)]"
              >
                <Trash2 className="size-4" /> 삭제
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="이름 또는 구분">
                <input
                  {...register(`thirdParties.${index}.partyName`)}
                  className={inputClass}
                  placeholder="예: A대행사 / 예약 담당자"
                />
              </Field>
              <Field label="유형">
                <select
                  {...register(`thirdParties.${index}.partyType`)}
                  className={inputClass}
                >
                  <option value="">선택해주세요</option>
                  <option value="agency">대행사</option>
                  <option value="employee">직원</option>
                  <option value="booking_manager">예약 담당자</option>
                  <option value="marketer">마케터</option>
                  <option value="webmaster">웹사이트 관리자</option>
                  <option value="unknown">잘 모르겠어요</option>
                </select>
              </Field>
              <Field label="언제쯤">
                <input
                  {...register(`thirdParties.${index}.approximatePeriod`)}
                  className={inputClass}
                />
              </Field>
              <Field label="계정 접근 정도">
                <select
                  {...register(`thirdParties.${index}.accountAccessLevel`)}
                  className={inputClass}
                >
                  <option value="">선택해주세요</option>
                  <option value="owner">소유자였어요</option>
                  <option value="manager">관리자였어요</option>
                  <option value="temporary">잠시 접근했어요</option>
                  <option value="none">접근하지 않았어요</option>
                  <option value="unknown">잘 모르겠어요</option>
                </select>
              </Field>
            </div>
            <Field label="부탁한 작업">
              <textarea
                {...register(`thirdParties.${index}.workRequested`)}
                rows={3}
                className={`${inputClass} mt-2 py-3`}
              />
            </Field>
            <Field label="추가 메모">
              <textarea
                {...register(`thirdParties.${index}.notes`)}
                rows={3}
                className={`${inputClass} mt-2 py-3`}
              />
            </Field>
          </article>
        ))}
      </div>
      <button
        type="button"
        disabled={parties.fields.length >= 10}
        onClick={() => parties.append(createEmptyThirdParty())}
        className="mt-5 inline-flex min-h-12 items-center gap-2 border-b border-[var(--navy-950)] text-sm font-bold disabled:opacity-40"
      >
        <Plus className="size-4" /> 진행을 도운 분 추가
      </button>
    </div>
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
