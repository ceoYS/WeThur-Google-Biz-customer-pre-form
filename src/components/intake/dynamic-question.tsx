"use client";

import { Controller, type Control } from "react-hook-form";

import type { ComposedQuestion } from "@/lib/question-modules";
import type { IntakePayloadInput } from "@/lib/schemas/intake";

const fieldClass =
  "min-h-14 w-full rounded-none border border-[var(--navy-300)] bg-white px-4 text-base text-[var(--navy-950)]";

export function DynamicQuestion({
  question,
  control,
  prefilledValue,
}: {
  question: ComposedQuestion;
  control: Control<IntakePayloadInput>;
  prefilledValue?: unknown;
}) {
  const name = `answers.${question.key}` as const;

  return (
    <div className="border-b border-[var(--navy-300)] py-7 last:border-0">
      <div className="mb-4">
        <label
          className="text-base leading-7 font-bold"
          htmlFor={`question-${question.key}`}
        >
          {question.label}
          {question.required ? (
            <span className="ml-2 text-xs text-[var(--navy-700)]">필수</span>
          ) : null}
        </label>
        {question.helpText ? (
          <p className="mt-2 text-sm leading-6 text-[var(--navy-700)]">
            {question.helpText}
          </p>
        ) : null}
        {prefilledValue !== undefined ? (
          <div className="mt-4 border-l-2 border-[var(--navy-950)] bg-[var(--neutral-100)] px-4 py-3 text-sm leading-6">
            미리 확인한 내용:{" "}
            <strong>{formatPrefilledValue(prefilledValue)}</strong>
          </div>
        ) : null}
      </div>

      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const value = field.value;
          if (question.type === "textarea") {
            return (
              <textarea
                {...field}
                value={typeof value === "string" ? value : ""}
                id={`question-${question.key}`}
                rows={5}
                className={`${fieldClass} py-4 leading-7`}
                placeholder="기억나시는 범위에서 알려주세요."
              />
            );
          }
          if (question.type === "text" || question.type === "date_period") {
            return (
              <input
                {...field}
                value={typeof value === "string" ? value : ""}
                id={`question-${question.key}`}
                className={fieldClass}
                placeholder={
                  question.type === "date_period"
                    ? "예: 2024년 봄쯤 / 정확한 시기 모름"
                    : "정확하지 않아도 괜찮습니다."
                }
              />
            );
          }
          if (question.type === "number") {
            return (
              <input
                id={`question-${question.key}`}
                type="number"
                min={0}
                max={100}
                className={fieldClass}
                value={
                  typeof value === "number" || typeof value === "string"
                    ? value
                    : ""
                }
                onChange={(event) =>
                  field.onChange(
                    event.target.value === "" ? "" : Number(event.target.value),
                  )
                }
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                placeholder="정확하지 않으면 비워두셔도 됩니다."
              />
            );
          }
          if (question.type === "boolean") {
            return (
              <div className="grid grid-cols-2 gap-2">
                {[true, false].map((option) => (
                  <button
                    key={String(option)}
                    type="button"
                    onClick={() => field.onChange(option)}
                    className={`min-h-14 border px-4 text-sm font-bold ${value === option ? "border-[var(--navy-950)] bg-[var(--navy-950)] text-white" : "border-[var(--navy-300)] bg-white"}`}
                  >
                    {option ? "네" : "아니요"}
                  </button>
                ))}
              </div>
            );
          }
          if (question.type === "confirmation") {
            if (question.options.length > 0) {
              return (
                <OptionButtons
                  options={question.options}
                  value={value}
                  onChange={field.onChange}
                  multiple={false}
                />
              );
            }
            return (
              <label className="flex min-h-14 cursor-pointer items-start gap-3 border border-[var(--navy-300)] bg-white p-4 text-sm leading-6">
                <input
                  type="checkbox"
                  checked={value === true}
                  onChange={(event) => field.onChange(event.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-[var(--navy-950)]"
                />{" "}
                확인했습니다
              </label>
            );
          }
          if (question.type === "multi_select") {
            return (
              <OptionButtons
                options={question.options}
                value={value}
                onChange={field.onChange}
                multiple
              />
            );
          }
          return (
            <OptionButtons
              options={question.options}
              value={value}
              onChange={field.onChange}
              multiple={false}
            />
          );
        }}
      />
    </div>
  );
}

function OptionButtons({
  options,
  value,
  onChange,
  multiple,
}: {
  options: string[];
  value: unknown;
  onChange: (value: string | string[]) => void;
  multiple: boolean;
}) {
  const selected = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const active = multiple ? selected.includes(option) : value === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (!multiple) return onChange(option);
              onChange(
                active
                  ? selected.filter((item) => item !== option)
                  : [...selected, option],
              );
            }}
            className={`min-h-14 border px-4 py-3 text-left text-sm font-bold ${active ? "border-[var(--navy-950)] bg-[var(--navy-950)] text-white" : "border-[var(--navy-300)] bg-white"}`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function formatPrefilledValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return "확인이 필요해요";
}
