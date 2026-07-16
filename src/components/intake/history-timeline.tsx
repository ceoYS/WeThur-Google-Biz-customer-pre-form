"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

import {
  createEmptyHistoryEvent,
  type IntakePayloadInput,
} from "@/lib/schemas/intake";

const inputClass =
  "min-h-12 w-full border border-[var(--navy-300)] bg-white px-3 text-sm";

export function HistoryTimeline() {
  const { control, register } = useFormContext<IntakePayloadInput>();
  const events = useFieldArray({ control, name: "historyEvents" });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function dragEnded(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = events.fields.findIndex((field) => field.id === active.id);
    const newIndex = events.fields.findIndex((field) => field.id === over.id);
    if (oldIndex >= 0 && newIndex >= 0) events.move(oldIndex, newIndex);
  }

  return (
    <div className="mt-10">
      <div className="mb-5">
        <h3 className="text-xl font-black tracking-[-0.03em]">
          기억나는 등록 흐름
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--navy-700)]">
          최대 10개까지 추가하고 손잡이로 순서를 바꿀 수 있습니다. 처음에는 쉬운
          네 항목만 보여드립니다.
        </p>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={dragEnded}
      >
        <SortableContext
          items={events.fields.map((field) => field.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {events.fields.map((field, index) => (
              <SortableHistoryEvent
                key={field.id}
                dragId={field.id}
                index={index}
                onRemove={() => events.remove(index)}
                register={register}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {events.fields.length === 0 ? (
        <div className="border border-dashed border-[var(--navy-300)] px-5 py-10 text-center text-sm leading-6 text-[var(--navy-700)]">
          예: A대행사 최초 등록 → 영상 인증 → 업체명 수정 → 검색에서 사라짐
        </div>
      ) : null}
      <button
        type="button"
        disabled={events.fields.length >= 10}
        onClick={() => events.append(createEmptyHistoryEvent())}
        className="mt-5 inline-flex min-h-12 items-center gap-2 border-b border-[var(--navy-950)] text-sm font-bold disabled:opacity-40"
      >
        <Plus className="size-4" /> 과거 등록 이력 추가
      </button>
    </div>
  );
}

function SortableHistoryEvent({
  dragId,
  index,
  onRemove,
  register,
}: {
  dragId: string;
  index: number;
  onRemove: () => void;
  register: ReturnType<typeof useFormContext<IntakePayloadInput>>["register"];
}) {
  const [expanded, setExpanded] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dragId });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`border bg-[var(--neutral-50)] p-4 sm:p-6 ${isDragging ? "border-[var(--navy-950)] opacity-80" : "border-[var(--navy-300)]"}`}
    >
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex size-11 shrink-0 cursor-grab items-center justify-center"
          aria-label="순서 바꾸기"
        >
          <GripVertical className="size-5" />
        </button>
        <h4 className="flex-1 font-black">등록 이력 {index + 1}</h4>
        <button
          type="button"
          onClick={onRemove}
          className="flex min-h-11 items-center gap-2 px-2 text-xs font-bold text-[var(--navy-700)]"
        >
          <Trash2 className="size-4" /> 삭제
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="언제쯤이었나요?">
          <input
            {...register(`historyEvents.${index}.approximatePeriod`)}
            className={inputClass}
            placeholder="예: 2024년 봄쯤"
          />
          <label className="mt-2 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              {...register(`historyEvents.${index}.periodUnknown`)}
            />{" "}
            정확한 시기 모름
          </label>
        </Field>
        <Field label="누가 진행했나요?">
          <input
            {...register(`historyEvents.${index}.handledBy`)}
            className={inputClass}
            placeholder="예: A대행사 / 직원"
          />
          <label className="mt-2 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              {...register(`historyEvents.${index}.handlerUnknown`)}
            />{" "}
            누가 진행했는지 모름
          </label>
        </Field>
        <Field label="사용한 프로필 이름">
          <input
            {...register(`historyEvents.${index}.profileName`)}
            className={inputClass}
          />
        </Field>
        <Field label="결과">
          <select
            {...register(`historyEvents.${index}.result`)}
            className={inputClass}
          >
            <option value="">선택해주세요</option>
            <option value="approved">승인됨</option>
            <option value="suspended">정지됨</option>
            <option value="disappeared">검색에서 사라짐</option>
            <option value="rejected">등록 거절</option>
            <option value="duplicate">중복으로 표시됨</option>
            <option value="unknown">잘 모르겠어요</option>
          </select>
        </Field>
      </div>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mt-5 min-h-11 border-b border-[var(--navy-950)] text-sm font-bold"
      >
        {expanded ? "상세 내용 접기" : "조금 더 기억나는 내용이 있어요"}
      </button>
      {expanded ? (
        <div className="mt-6 grid gap-4 border-t border-[var(--navy-300)] pt-6 sm:grid-cols-2">
          <Field label="담당자 유형">
            <input
              {...register(`historyEvents.${index}.handlerType`)}
              className={inputClass}
              placeholder="대행사, 직원, 마케터 등"
            />
          </Field>
          <Field label="계정 구분 이름">
            <input
              {...register(`historyEvents.${index}.accountLabel`)}
              className={inputClass}
              placeholder="예: 대표님 계정 / A대행사 계정"
            />
          </Field>
          <Field label="이메일 (선택)">
            <input
              {...register(`historyEvents.${index}.accountEmail`)}
              type="email"
              className={inputClass}
              autoComplete="off"
            />
            <span className="mt-1 block text-xs text-[var(--navy-700)]">
              비밀번호나 인증번호는 입력하지 마세요.
            </span>
          </Field>
          <Field label="사용한 주소">
            <input
              {...register(`historyEvents.${index}.address`)}
              className={inputClass}
            />
          </Field>
          <Field label="사용한 층">
            <input
              {...register(`historyEvents.${index}.floor`)}
              className={inputClass}
            />
          </Field>
          <Field label="전화번호">
            <input
              {...register(`historyEvents.${index}.phone`)}
              className={inputClass}
            />
          </Field>
          <Field label="웹사이트">
            <input
              {...register(`historyEvents.${index}.website`)}
              className={inputClass}
            />
          </Field>
          <Field label="주 카테고리">
            <input
              {...register(`historyEvents.${index}.primaryCategory`)}
              className={inputClass}
            />
          </Field>
          <Field label="인증 방법">
            <input
              {...register(`historyEvents.${index}.verificationMethod`)}
              className={inputClass}
              placeholder="영상, 전화, 우편 등"
            />
          </Field>
          <Field label="승인 상태">
            <input
              {...register(`historyEvents.${index}.approvalStatus`)}
              className={inputClass}
            />
          </Field>
          <Field label="기억나는 Google 안내 문구">
            <textarea
              {...register(`historyEvents.${index}.googleMessage`)}
              rows={3}
              className={`${inputClass} py-3`}
            />
          </Field>
          <Field label="사라지기 전에 바뀐 정보">
            <textarea
              {...register(`historyEvents.${index}.changesBeforeResult`)}
              rows={3}
              className={`${inputClass} py-3`}
            />
          </Field>
          <Field label="이의신청 대기 중 재등록 여부">
            <select
              {...register(`historyEvents.${index}.appealPendingWhenRecreated`)}
              className={inputClass}
            >
              <option value="">선택해주세요</option>
              <option value="yes">있어요</option>
              <option value="no">없어요</option>
              <option value="unknown">잘 모르겠어요</option>
              <option value="not_applicable">해당 없음</option>
            </select>
          </Field>
          <Field label="소유자·관리자 변경">
            <textarea
              {...register(`historyEvents.${index}.ownershipChangeNotes`)}
              rows={3}
              className={`${inputClass} py-3`}
            />
          </Field>
          <Field label="관련 자료 메모">
            <textarea
              {...register(`historyEvents.${index}.evidenceNotes`)}
              rows={3}
              className={`${inputClass} py-3`}
            />
          </Field>
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
    <label className="block text-sm font-bold">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}
