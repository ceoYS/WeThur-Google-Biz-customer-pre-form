"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, ExternalLink, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { createCaseSchema, type CreateCaseInput } from "@/lib/schemas/case";
import { defaultRequestedEvidence } from "@/lib/required-information";

export type ModuleOption = {
  id: string;
  moduleKey: string;
  moduleType: "common" | "industry" | "issue";
  title: string;
  description: string;
};

type AdminOption = { id: string; label: string };

type CreationResult = {
  caseId: string;
  caseCode: string;
  intakeUrl: string;
};

const defaultIntroduction = `대표님, 이번 질문은 누가 잘못했는지 찾기 위한 설문이 아닙니다.

예전에 Google 지도 등록이 어떤 흐름으로 진행됐는지 함께 정리해서, 같은 문제가 반복되지 않도록 원인을 좁히기 위한 과정입니다.

정확한 날짜나 내용이 기억나지 않으셔도 괜찮습니다. 기억나는 범위에서 적어주시고, 모르는 항목은 ‘잘 모르겠어요’를 선택해주세요.`;

const inputClass =
  "min-h-12 w-full rounded-none border border-[var(--navy-300)] bg-white px-4 text-sm text-[var(--navy-950)] placeholder:text-[var(--navy-300)]";
const labelClass = "mb-2 block text-sm font-bold";

export function CaseCreationForm({
  modules,
  admins,
  currentAdminId,
}: {
  modules: ModuleOption[];
  admins: AdminOption[];
  currentAdminId: string;
}) {
  const commonModules = modules.filter(
    (module) => module.moduleType === "common",
  );
  const industryModules = modules.filter(
    (module) => module.moduleType === "industry",
  );
  const issueModules = modules.filter(
    (module) => module.moduleType === "issue",
  );
  const industryIds = new Set(industryModules.map((module) => module.id));
  const [result, setResult] = useState<CreationResult | null>(null);
  const [serverError, setServerError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateCaseInput>({
    resolver: zodResolver(createCaseSchema),
    defaultValues: {
      businessName: "",
      industryKey: "",
      customerName: "",
      customerPhone: "",
      customerContactChannel: "",
      customerIntro: defaultIntroduction,
      expectedCompletionMinutes: 20,
      moduleIds: commonModules.map((module) => module.id),
      knownFacts: [],
      profileCandidates: [],
      customQuestions: [],
      requestedEvidence: defaultRequestedEvidence,
      assignedAdminId: currentAdminId,
      website: "",
    },
  });

  const facts = useFieldArray({ control, name: "knownFacts" });
  const candidates = useFieldArray({ control, name: "profileCandidates" });
  const customQuestions = useFieldArray({ control, name: "customQuestions" });
  const evidence = useFieldArray({ control, name: "requestedEvidence" });
  const selectedModuleIds = useWatch({ control, name: "moduleIds" }) ?? [];
  const selectedIndustryKey = useWatch({ control, name: "industryKey" });

  function toggleModule(moduleId: string, checked: boolean) {
    const next = checked
      ? Array.from(new Set([...selectedModuleIds, moduleId]))
      : selectedModuleIds.filter((id) => id !== moduleId);
    setValue("moduleIds", next, { shouldDirty: true, shouldValidate: true });
  }

  function selectIndustry(moduleKey: string) {
    const selected = industryModules.find(
      (module) => module.moduleKey === moduleKey,
    );
    const withoutIndustry = selectedModuleIds.filter(
      (id) => !industryIds.has(id),
    );
    setValue("industryKey", moduleKey, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(
      "moduleIds",
      selected ? [...withoutIndustry, selected.id] : withoutIndustry,
      { shouldDirty: true, shouldValidate: true },
    );
  }

  async function submitCase(input: CreateCaseInput) {
    setServerError("");
    const parsed = createCaseSchema.parse(input);
    const response = await fetch("/api/admin/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
    const responseBody = (await response.json()) as CreationResult & {
      error?: string;
    };
    if (!response.ok) {
      setServerError(responseBody.error ?? "사건을 생성하지 못했습니다.");
      return;
    }
    setResult(responseBody);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function copy(text: string, message: string) {
    await navigator.clipboard.writeText(text);
    setCopyMessage(message);
  }

  if (result) {
    const messageTemplate = `대표님, Google 지도 등록 흐름을 안전하게 확인하기 위한 WeThru 사전 진단 링크입니다.\n\n${result.intakeUrl}\n\n정확히 기억나지 않는 내용은 ‘잘 모르겠어요’를 선택하셔도 됩니다. Google 비밀번호나 인증번호는 입력하지 말아주세요.`;
    return (
      <section className="mx-auto max-w-3xl py-10">
        <div className="border-l-4 border-[var(--navy-950)] pl-6">
          <Check className="size-7" />
          <h1 className="mt-6 text-4xl font-black tracking-[-0.05em]">
            고객 사건을 만들었습니다.
          </h1>
          <p className="mt-3 text-sm text-[var(--navy-700)]">
            사건 코드 {result.caseCode}
          </p>
        </div>
        <div className="mt-12 border-y border-[var(--navy-300)] py-7">
          <p className="text-xs font-bold tracking-[0.16em] text-[var(--navy-700)] uppercase">
            Secure customer link
          </p>
          <p className="mt-4 text-sm leading-7 break-all">{result.intakeUrl}</p>
          <p className="mt-3 text-xs leading-5 text-[var(--navy-700)]">
            원본 링크는 보안상 저장하지 않습니다. 지금 복사하거나, 나중에 사건
            화면에서 새 링크를 만들어주세요.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                copy(result.intakeUrl, "고객 링크를 복사했습니다.")
              }
              className="inline-flex min-h-11 items-center gap-2 bg-[var(--navy-950)] px-4 text-sm font-bold text-white"
            >
              <Copy className="size-4" /> 링크 복사
            </button>
            <a
              href={result.intakeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 border border-[var(--navy-950)] px-4 text-sm font-bold"
            >
              <ExternalLink className="size-4" /> 고객 화면 미리보기
            </a>
          </div>
        </div>
        <div className="mt-10">
          <h2 className="text-lg font-bold">고객 안내 문구</h2>
          <pre className="mt-4 border-l-2 border-[var(--navy-300)] pl-5 font-[inherit] text-sm leading-7 whitespace-pre-wrap text-[var(--navy-700)]">
            {messageTemplate}
          </pre>
          <button
            type="button"
            onClick={() => copy(messageTemplate, "안내 문구를 복사했습니다.")}
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold"
          >
            <Copy className="size-4" /> 안내 문구 복사
          </button>
        </div>
        {copyMessage ? (
          <p role="status" className="mt-4 text-sm font-bold">
            {copyMessage}
          </p>
        ) : null}
        <div className="mt-12 flex flex-wrap gap-4 border-t border-[var(--navy-300)] pt-7">
          <Link
            href={`/admin/cases/${result.caseId}`}
            className="min-h-12 bg-[var(--navy-950)] px-5 py-3 text-sm font-bold text-white"
          >
            사건 화면 열기
          </Link>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="min-h-12 px-5 py-3 text-sm font-bold"
          >
            다른 사건 만들기
          </button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit(submitCase)} className="pb-24">
      <input
        {...register("website")}
        className="sr-only"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="space-y-16">
          <FormSection number="01" title="고객과 사업장">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="사업장 이름" error={errors.businessName?.message}>
                <input
                  {...register("businessName")}
                  className={inputClass}
                  placeholder="예: 샘플 스튜디오"
                />
              </Field>
              <Field
                label="고객 이름 또는 호칭"
                error={errors.customerName?.message}
              >
                <input
                  {...register("customerName")}
                  className={inputClass}
                  placeholder="예: 김대표님"
                />
              </Field>
              <Field
                label="연락 채널"
                error={errors.customerContactChannel?.message}
              >
                <input
                  {...register("customerContactChannel")}
                  className={inputClass}
                  placeholder="예: 카카오톡"
                />
              </Field>
              <Field
                label="연락처 (선택)"
                error={errors.customerPhone?.message}
              >
                <input
                  {...register("customerPhone")}
                  className={inputClass}
                  autoComplete="off"
                />
              </Field>
              <Field
                label="예상 작성 시간"
                error={errors.expectedCompletionMinutes?.message}
              >
                <div className="flex items-center gap-3">
                  <input
                    {...register("expectedCompletionMinutes", {
                      valueAsNumber: true,
                    })}
                    type="number"
                    min={5}
                    max={180}
                    className={inputClass}
                  />
                  <span className="shrink-0 text-sm">분</span>
                </div>
              </Field>
              <Field
                label="담당 관리자"
                error={errors.assignedAdminId?.message}
              >
                <select {...register("assignedAdminId")} className={inputClass}>
                  {admins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="고객별 첫 안내" error={errors.customerIntro?.message}>
              <textarea
                {...register("customerIntro")}
                rows={9}
                className={`${inputClass} py-4 leading-7`}
              />
            </Field>
          </FormSection>

          <FormSection number="02" title="질문 모듈">
            <div>
              <h3 className={labelClass}>공통 질문</h3>
              <div className="grid gap-px bg-[var(--navy-300)] sm:grid-cols-2">
                {commonModules.map((module) => (
                  <ModuleCheckbox
                    key={module.id}
                    module={module}
                    checked={selectedModuleIds.includes(module.id)}
                    onChange={(checked) => toggleModule(module.id, checked)}
                  />
                ))}
              </div>
            </div>
            <Field label="업종 모듈" error={errors.industryKey?.message}>
              <select
                value={selectedIndustryKey}
                onChange={(event) => selectIndustry(event.target.value)}
                className={inputClass}
              >
                <option value="">업종을 선택해주세요</option>
                {industryModules.map((module) => (
                  <option key={module.id} value={module.moduleKey}>
                    {module.title}
                  </option>
                ))}
              </select>
            </Field>
            <div>
              <h3 className={labelClass}>이슈 모듈 (여러 개 선택 가능)</h3>
              <div className="grid gap-px bg-[var(--navy-300)] sm:grid-cols-2">
                {issueModules.map((module) => (
                  <ModuleCheckbox
                    key={module.id}
                    module={module}
                    checked={selectedModuleIds.includes(module.id)}
                    onChange={(checked) => toggleModule(module.id, checked)}
                  />
                ))}
              </div>
              {errors.moduleIds?.message ? (
                <p className="mt-2 text-xs font-bold">
                  {errors.moduleIds.message}
                </p>
              ) : null}
            </div>
          </FormSection>

          <FormSection number="03" title="미리 확인한 사실">
            <p className="text-sm leading-6 text-[var(--navy-700)]">
              실제 고객 답변이 아닌 사전 확인 정보입니다. 출처와 고객 수정 가능
              여부를 함께 저장합니다.
            </p>
            <p className="text-xs leading-6 text-[var(--navy-700)]">
              이미 확보한 상호는 registration_name, 주소는 official_address,
              업종·종목은 primary_activity, 과거 정지·검색 제외 사실은
              overall_history로 넣으면 고객 화면에 값이 채워진 상태로
              표시됩니다.
            </p>
            <div className="space-y-4">
              {facts.fields.map((field, index) => (
                <Repeater
                  key={field.id}
                  title={`알려진 사실 ${index + 1}`}
                  onRemove={() => facts.remove(index)}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="필드 키">
                      <input
                        {...register(`knownFacts.${index}.fieldKey`)}
                        className={inputClass}
                        placeholder="official_address"
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
                        <option value="admin_prefill">관리자 사전 확인</option>
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
                  <label className="mt-4 flex min-h-11 items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      {...register(`knownFacts.${index}.customerCanEdit`)}
                      className="size-5 accent-[var(--navy-950)]"
                    />{" "}
                    고객이 확인·수정할 수 있음
                  </label>
                </Repeater>
              ))}
            </div>
            <AddButton
              label="알려진 사실 추가"
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
          </FormSection>

          <FormSection number="04" title="현재 관련 프로필 후보">
            <p className="text-sm leading-6 text-[var(--navy-700)]">
              중복이나 위반으로 미리 단정하지 않고, 비교가 필요한 후보로만
              등록합니다.
            </p>
            <div className="space-y-4">
              {candidates.fields.map((field, index) => (
                <Repeater
                  key={field.id}
                  title={`프로필 후보 ${index + 1}`}
                  onRemove={() => candidates.remove(index)}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="표시된 업체명">
                      <input
                        {...register(
                          `profileCandidates.${index}.displayedName`,
                        )}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Google Maps 링크">
                      <input
                        {...register(`profileCandidates.${index}.mapsUrl`)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="표시 주소">
                      <input
                        {...register(
                          `profileCandidates.${index}.displayedAddress`,
                        )}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="표시 층">
                      <input
                        {...register(
                          `profileCandidates.${index}.displayedFloor`,
                        )}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="표시 전화">
                      <input
                        {...register(
                          `profileCandidates.${index}.displayedPhone`,
                        )}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="표시 카테고리">
                      <input
                        {...register(
                          `profileCandidates.${index}.displayedCategory`,
                        )}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <Field label="관계 메모">
                    <textarea
                      {...register(`profileCandidates.${index}.relationNotes`)}
                      rows={3}
                      className={`${inputClass} py-3`}
                    />
                  </Field>
                </Repeater>
              ))}
            </div>
            <AddButton
              label="프로필 후보 추가"
              disabled={candidates.fields.length >= 10}
              onClick={() =>
                candidates.append({
                  mapsUrl: "",
                  displayedName: "",
                  displayedAddress: "",
                  displayedFloor: "",
                  displayedPhone: "",
                  displayedWebsite: "",
                  displayedCategory: "",
                  relationNotes: "",
                })
              }
            />
          </FormSection>

          <FormSection number="05" title="고객별 추가 질문">
            <div className="space-y-4">
              {customQuestions.fields.map((field, index) => (
                <Repeater
                  key={field.id}
                  title={`추가 질문 ${index + 1}`}
                  onRemove={() => customQuestions.remove(index)}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="질문 키">
                      <input
                        {...register(`customQuestions.${index}.questionKey`)}
                        className={inputClass}
                        placeholder="custom_context"
                      />
                    </Field>
                    <Field label="표시 구간">
                      <select
                        {...register(`customQuestions.${index}.sectionKey`)}
                        className={inputClass}
                      >
                        <option value="current_business">현재 사업장</option>
                        <option value="history_summary">과거 흐름</option>
                        <option value="changes">변경과 담당자</option>
                        <option value="profile_candidates">현재 프로필</option>
                        <option value="evidence">증빙</option>
                        <option value="confirmation">마지막 확인</option>
                      </select>
                    </Field>
                    <Field label="질문 형식">
                      <select
                        {...register(`customQuestions.${index}.questionType`)}
                        className={inputClass}
                      >
                        <option value="text">짧은 답변</option>
                        <option value="textarea">긴 답변</option>
                        <option value="boolean">예/아니오</option>
                        <option value="single_select">한 개 선택</option>
                        <option value="multi_select">여러 개 선택</option>
                      </select>
                    </Field>
                    <label className="flex min-h-12 items-center gap-3 pt-6 text-sm">
                      <input
                        type="checkbox"
                        {...register(`customQuestions.${index}.required`)}
                        className="size-5 accent-[var(--navy-950)]"
                      />{" "}
                      필수 질문
                    </label>
                  </div>
                  <Field label="고객에게 보일 질문">
                    <textarea
                      {...register(`customQuestions.${index}.label`)}
                      rows={2}
                      className={`${inputClass} py-3`}
                    />
                  </Field>
                  <Field label="도움말">
                    <input
                      {...register(`customQuestions.${index}.helpText`)}
                      className={inputClass}
                    />
                  </Field>
                </Repeater>
              ))}
            </div>
            <AddButton
              label="고객별 질문 추가"
              onClick={() =>
                customQuestions.append({
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
          </FormSection>

          <FormSection number="06" title="요청할 증빙 자료">
            <div className="divide-y divide-[var(--navy-300)] border-y border-[var(--navy-300)]">
              {evidence.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid gap-3 py-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                >
                  <Field label="자료 분류">
                    <input
                      {...register(
                        `requestedEvidence.${index}.evidenceCategory`,
                      )}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="고객 표시 이름">
                    <input
                      {...register(`requestedEvidence.${index}.label`)}
                      className={inputClass}
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() => evidence.remove(index)}
                    className="min-h-12 px-3 text-sm font-bold"
                  >
                    <Trash2 className="size-4" aria-label="삭제" />
                  </button>
                </div>
              ))}
            </div>
            <AddButton
              label="증빙 항목 추가"
              onClick={() =>
                evidence.append({
                  evidenceCategory: "",
                  label: "",
                  helpText: "불필요한 개인정보는 가려주세요.",
                  required: false,
                })
              }
            />
          </FormSection>
        </div>

        <aside className="lg:sticky lg:top-8 lg:h-fit">
          <div className="border-t-4 border-[var(--navy-950)] bg-[var(--neutral-100)] p-5">
            <p className="text-xs font-bold tracking-[0.16em] text-[var(--navy-700)] uppercase">
              Case setup
            </p>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt>선택 모듈</dt>
                <dd className="font-bold">{selectedModuleIds.length}개</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>알려진 사실</dt>
                <dd className="font-bold">{facts.fields.length}개</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>프로필 후보</dt>
                <dd className="font-bold">{candidates.fields.length}개</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>추가 질문</dt>
                <dd className="font-bold">{customQuestions.fields.length}개</dd>
              </div>
            </dl>
            {serverError ? (
              <p
                role="alert"
                className="mt-5 border-l-2 border-[var(--navy-950)] pl-3 text-sm leading-6"
              >
                {serverError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting || modules.length === 0}
              className="mt-7 min-h-14 w-full bg-[var(--navy-950)] px-4 font-bold text-white disabled:opacity-50"
            >
              {isSubmitting ? "사건 생성 중" : "보안 링크와 사건 만들기"}
            </button>
            <p className="mt-4 text-xs leading-5 text-[var(--navy-700)]">
              저장 후 원본 보안 링크는 한 번만 표시됩니다. 사건 UUID는 고객
              URL에 포함되지 않습니다.
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}

function FormSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-7 flex items-baseline gap-4 border-b border-[var(--navy-300)] pb-5">
        <span className="text-xs font-black tracking-[0.16em] text-[var(--navy-700)]">
          {number}
        </span>
        <h2 className="text-2xl font-black tracking-[-0.04em]">{title}</h2>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
      {error ? (
        <span className="mt-2 block text-xs font-bold">{error}</span>
      ) : null}
    </label>
  );
}

function ModuleCheckbox({
  module,
  checked,
  onChange,
}: {
  module: ModuleOption;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-28 cursor-pointer gap-4 bg-[var(--neutral-50)] p-5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-5 shrink-0 accent-[var(--navy-950)]"
      />
      <span>
        <span className="block text-sm font-bold">{module.title}</span>
        <span className="mt-2 block text-xs leading-5 text-[var(--navy-700)]">
          {module.description}
        </span>
      </span>
    </label>
  );
}

function Repeater({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[var(--navy-300)] bg-[var(--neutral-50)] p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-bold">{title}</h3>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex min-h-11 items-center gap-2 px-2 text-xs font-bold text-[var(--navy-700)]"
        >
          <Trash2 className="size-4" /> 삭제
        </button>
      </div>
      {children}
    </div>
  );
}

function AddButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-12 items-center gap-2 border-b border-[var(--navy-950)] px-1 text-sm font-bold disabled:opacity-40"
    >
      <Plus className="size-4" /> {label}
    </button>
  );
}
