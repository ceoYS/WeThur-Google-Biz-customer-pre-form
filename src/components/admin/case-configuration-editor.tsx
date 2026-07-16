"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import type { ModuleOption } from "@/components/admin/case-creation-form";
import { createCaseSchema, type CreateCaseInput } from "@/lib/schemas/case";

const inputClass =
  "min-h-12 w-full border border-[var(--navy-300)] bg-white px-3 text-sm";

export function CaseConfigurationEditor({
  caseId,
  modules,
  admins,
  initialValues,
}: {
  caseId: string;
  modules: ModuleOption[];
  admins: Array<{ id: string; label: string }>;
  initialValues: CreateCaseInput;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<CreateCaseInput>({
    resolver: zodResolver(createCaseSchema),
    defaultValues: initialValues,
  });
  const facts = useFieldArray({ control, name: "knownFacts" });
  const profiles = useFieldArray({ control, name: "profileCandidates" });
  const questions = useFieldArray({ control, name: "customQuestions" });
  const evidence = useFieldArray({ control, name: "requestedEvidence" });
  const selectedModuleIds = useWatch({ control, name: "moduleIds" }) ?? [];
  const industryKey = useWatch({ control, name: "industryKey" });
  const industryModules = modules.filter(
    (item) => item.moduleType === "industry",
  );
  const industryIds = new Set(industryModules.map((item) => item.id));

  function toggleModule(id: string, checked: boolean) {
    setValue(
      "moduleIds",
      checked
        ? Array.from(new Set([...selectedModuleIds, id]))
        : selectedModuleIds.filter((value) => value !== id),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  function selectIndustry(key: string) {
    const selected = industryModules.find((item) => item.moduleKey === key);
    setValue("industryKey", key, { shouldDirty: true, shouldValidate: true });
    setValue(
      "moduleIds",
      [
        ...selectedModuleIds.filter((id) => !industryIds.has(id)),
        ...(selected ? [selected.id] : []),
      ],
      { shouldDirty: true, shouldValidate: true },
    );
  }

  async function save(values: CreateCaseInput) {
    setMessage("");
    const response = await fetch(`/api/admin/cases/${caseId}/configuration`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createCaseSchema.parse(values)),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(result.error ?? "사건 설정을 저장하지 못했습니다.");
      return;
    }
    setMessage("사건 설정을 저장했습니다.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(save)} className="space-y-14 pb-24">
      <input
        {...register("website")}
        className="sr-only"
        tabIndex={-1}
        autoComplete="off"
      />
      <EditorSection title="고객과 사건 기본 정보">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="사업장 이름">
            <input {...register("businessName")} className={inputClass} />
          </Field>
          <Field label="고객 이름">
            <input {...register("customerName")} className={inputClass} />
          </Field>
          <Field label="연락 채널">
            <input
              {...register("customerContactChannel")}
              className={inputClass}
            />
          </Field>
          <Field label="연락처">
            <input {...register("customerPhone")} className={inputClass} />
          </Field>
          <Field label="예상 작성 시간">
            <input
              {...register("expectedCompletionMinutes", {
                valueAsNumber: true,
              })}
              type="number"
              min={5}
              max={180}
              className={inputClass}
            />
          </Field>
          <Field label="담당 관리자">
            <select {...register("assignedAdminId")} className={inputClass}>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="고객별 첫 안내">
          <textarea
            {...register("customerIntro")}
            rows={8}
            className={`${inputClass} py-3 leading-7`}
          />
        </Field>
      </EditorSection>

      <EditorSection title="질문 모듈">
        <Field label="업종">
          <select
            value={industryKey}
            onChange={(event) => selectIndustry(event.target.value)}
            className={inputClass}
          >
            <option value="">업종 선택</option>
            {industryModules.map((item) => (
              <option key={item.id} value={item.moduleKey}>
                {item.title}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-px bg-[var(--navy-300)] sm:grid-cols-2 lg:grid-cols-3">
          {modules
            .filter((item) => item.moduleType !== "industry")
            .map((item) => (
              <label
                key={item.id}
                className="flex min-h-24 gap-3 bg-[var(--neutral-50)] p-4"
              >
                <input
                  type="checkbox"
                  checked={selectedModuleIds.includes(item.id)}
                  onChange={(event) =>
                    toggleModule(item.id, event.target.checked)
                  }
                  className="mt-1 size-5 accent-[var(--navy-950)]"
                />
                <span>
                  <strong className="text-sm">{item.title}</strong>
                  <span className="mt-1 block text-xs leading-5 text-[var(--navy-700)]">
                    {item.description}
                  </span>
                </span>
              </label>
            ))}
        </div>
        {errors.moduleIds ? (
          <p className="text-sm font-bold">
            질문 모듈을 한 개 이상 선택해주세요.
          </p>
        ) : null}
      </EditorSection>

      <EditorSection title="미리 확인한 사실">
        <div className="space-y-3">
          {facts.fields.map((field, index) => (
            <Repeater key={field.id} onRemove={() => facts.remove(index)}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="필드 키">
                  <input
                    {...register(`knownFacts.${index}.fieldKey`)}
                    className={inputClass}
                  />
                </Field>
                <Field label="값">
                  <input
                    {...register(`knownFacts.${index}.value`)}
                    className={inputClass}
                  />
                </Field>
                <Field label="출처">
                  <select
                    {...register(`knownFacts.${index}.sourceType`)}
                    className={inputClass}
                  >
                    <option value="admin_prefill">관리자 확인</option>
                    <option value="document">문서</option>
                    <option value="public_source">공개 정보</option>
                    <option value="customer_statement">고객 진술</option>
                    <option value="unknown">미확인</option>
                  </select>
                </Field>
                <Field label="출처 메모">
                  <input
                    {...register(`knownFacts.${index}.sourceNote`)}
                    className={inputClass}
                  />
                </Field>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  {...register(`knownFacts.${index}.customerCanEdit`)}
                />{" "}
                고객 확인·수정 가능
              </label>
            </Repeater>
          ))}
        </div>
        <Add
          label="사실 추가"
          onClick={() =>
            facts.append({
              fieldKey: "",
              value: "",
              sourceType: "admin_prefill",
              sourceNote: "",
              customerCanEdit: true,
            })
          }
        />
      </EditorSection>

      <EditorSection title="현재 관련 프로필 후보">
        <div className="space-y-3">
          {profiles.fields.map((field, index) => (
            <Repeater key={field.id} onRemove={() => profiles.remove(index)}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="표시명">
                  <input
                    {...register(`profileCandidates.${index}.displayedName`)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Maps 링크">
                  <input
                    {...register(`profileCandidates.${index}.mapsUrl`)}
                    className={inputClass}
                  />
                </Field>
                <Field label="주소">
                  <input
                    {...register(`profileCandidates.${index}.displayedAddress`)}
                    className={inputClass}
                  />
                </Field>
                <Field label="층">
                  <input
                    {...register(`profileCandidates.${index}.displayedFloor`)}
                    className={inputClass}
                  />
                </Field>
                <Field label="전화">
                  <input
                    {...register(`profileCandidates.${index}.displayedPhone`)}
                    className={inputClass}
                  />
                </Field>
                <Field label="카테고리">
                  <input
                    {...register(
                      `profileCandidates.${index}.displayedCategory`,
                    )}
                    className={inputClass}
                  />
                </Field>
              </div>
            </Repeater>
          ))}
        </div>
        <Add
          label="프로필 후보 추가"
          onClick={() =>
            profiles.append({
              displayedName: "",
              mapsUrl: "",
              displayedAddress: "",
              displayedFloor: "",
              displayedPhone: "",
              displayedWebsite: "",
              displayedCategory: "",
              relationNotes: "",
            })
          }
        />
      </EditorSection>

      <EditorSection title="고객별 추가 질문">
        <div className="space-y-3">
          {questions.fields.map((field, index) => (
            <Repeater key={field.id} onRemove={() => questions.remove(index)}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="질문 키">
                  <input
                    {...register(`customQuestions.${index}.questionKey`)}
                    className={inputClass}
                  />
                </Field>
                <Field label="구간">
                  <select
                    {...register(`customQuestions.${index}.sectionKey`)}
                    className={inputClass}
                  >
                    <option value="current_business">현재 사업장</option>
                    <option value="history_summary">과거 흐름</option>
                    <option value="changes">변경</option>
                    <option value="profile_candidates">프로필</option>
                    <option value="evidence">증빙</option>
                    <option value="goals">목표</option>
                    <option value="confirmation">확인</option>
                  </select>
                </Field>
                <Field label="형식">
                  <select
                    {...register(`customQuestions.${index}.questionType`)}
                    className={inputClass}
                  >
                    <option value="text">짧은 답변</option>
                    <option value="textarea">긴 답변</option>
                    <option value="single_select">한 개 선택</option>
                    <option value="multi_select">여러 개 선택</option>
                    <option value="boolean">예/아니오</option>
                  </select>
                </Field>
                <Field label="질문">
                  <input
                    {...register(`customQuestions.${index}.label`)}
                    className={inputClass}
                  />
                </Field>
              </div>
            </Repeater>
          ))}
        </div>
        <Add
          label="추가 질문 만들기"
          onClick={() =>
            questions.append({
              sectionKey: "history_summary",
              questionKey: "",
              label: "",
              helpText: "정확하지 않아도 괜찮습니다.",
              questionType: "textarea",
              choices: [],
              required: false,
              conditionalLogic: {},
            })
          }
        />
      </EditorSection>

      <EditorSection title="요청 증빙">
        <div className="space-y-3">
          {evidence.fields.map((field, index) => (
            <Repeater key={field.id} onRemove={() => evidence.remove(index)}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="분류 키">
                  <input
                    {...register(`requestedEvidence.${index}.evidenceCategory`)}
                    className={inputClass}
                  />
                </Field>
                <Field label="고객 표시 이름">
                  <input
                    {...register(`requestedEvidence.${index}.label`)}
                    className={inputClass}
                  />
                </Field>
              </div>
            </Repeater>
          ))}
        </div>
        <Add
          label="증빙 요청 추가"
          onClick={() =>
            evidence.append({
              evidenceCategory: "",
              label: "",
              helpText: "불필요한 개인정보는 가려주세요.",
              required: false,
            })
          }
        />
      </EditorSection>

      {message ? (
        <p
          role="status"
          className="border-l-2 border-[var(--navy-950)] pl-4 text-sm"
        >
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-14 bg-[var(--navy-950)] px-7 font-bold text-white disabled:opacity-50"
      >
        {isSubmitting ? "저장 중" : "사건 설정 저장"}
      </button>
    </form>
  );
}

function EditorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-6 border-b border-[var(--navy-300)] pb-4 text-2xl font-black tracking-[-0.04em]">
        {title}
      </h2>
      <div className="space-y-5">{children}</div>
    </section>
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

function Repeater({
  onRemove,
  children,
}: {
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[var(--navy-300)] bg-[var(--neutral-50)] p-4">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-[var(--navy-700)]"
        >
          <Trash2 className="size-4" /> 삭제
        </button>
      </div>
      {children}
    </div>
  );
}

function Add({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 border-b border-[var(--navy-950)] text-sm font-bold"
    >
      <Plus className="size-4" /> {label}
    </button>
  );
}
