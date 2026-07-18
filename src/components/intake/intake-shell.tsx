"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Clock3, LockKeyhole, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { DynamicQuestion } from "@/components/intake/dynamic-question";
import { EvidenceUploader } from "@/components/intake/evidence-uploader";
import { HistoryTimeline } from "@/components/intake/history-timeline";
import { ProfileCandidateList } from "@/components/intake/profile-candidate-list";
import { ThirdPartyList } from "@/components/intake/third-party-list";
import {
  canSelectIntakeStep,
  firstIntakeStepId,
  getIntakeProgress,
  getNextStepId,
  getPreviousStepId,
  getStepIndex,
  intakeStepIds,
  isFinalIntakeStep,
  type IntakeStepId,
} from "@/lib/intake-navigation";
import { evaluateQuestionCondition } from "@/lib/question-modules";
import {
  intakePayloadSchema,
  safeParseIntakePayload,
  type IntakePayloadInput,
} from "@/lib/schemas/intake";
import type { PublicIntakeBundle } from "@/lib/public-intake";

const sectionDetails: Record<
  IntakeStepId,
  {
    title: string;
    description: string;
  }
> = {
  current_business: {
    title: "현재 사업장 모습을 먼저 알려주세요",
    description: "간판과 실제 운영 정보부터 편하게 확인합니다.",
  },
  history_summary: {
    title: "예전에 Google 지도 등록을 어떻게 진행했는지 떠올려볼게요",
    description: "정확한 날짜가 아니어도 괜찮습니다. 큰 흐름부터 정리합니다.",
  },
  changes: {
    title: "프로필이 사라지기 전후에 달라진 점이 있었나요?",
    description:
      "담당자와 변경 사항을 누가 잘못했는지 판단하지 않고 살펴봅니다.",
  },
  profile_candidates: {
    title: "현재 지도에서 보이는 항목을 함께 비교할게요",
    description: "현재 관련 프로필 후보를 확인하고, 다르면 바로잡아주세요.",
  },
  evidence: {
    title: "확인에 도움이 되는 자료가 있는지 알려주세요",
    description: "지금 자료가 없어도 괜찮습니다. 보유 여부부터 확인합니다.",
  },
  goals: {
    title: "대표님이 가장 원하는 결과를 알려주세요",
    description: "가능한 것과 먼저 확인할 일을 구분하기 위한 질문입니다.",
  },
  confirmation: {
    title: "마지막으로 함께 확인해주세요",
    description:
      "어려운 계약 문구가 아니라 안전한 진행 범위를 짧게 확인합니다.",
  },
};

const sections: Array<{
  key: IntakeStepId;
  title: string;
  description: string;
}> = intakeStepIds.map((key) => ({ key, ...sectionDetails[key] }));

const draftValidationMessage = "작성 내용을 다시 확인해주세요.";
const draftFailureMessage = "임시 저장하지 못했습니다.";
const submitFailureMessage = "제출하지 못했습니다.";
const approvedServerMessages = new Set([
  "유효하지 않은 고객 링크입니다.",
  "저장 요청이 많습니다. 잠시 후 다시 시도해주세요.",
  draftValidationMessage,
  "이미 제출된 사건입니다.",
  draftFailureMessage,
  "제출 요청이 많습니다. 잠시 후 다시 시도해주세요.",
  "고객 링크를 확인할 수 없습니다.",
  "마지막 필수 확인 항목을 확인해주세요.",
  "제출하지 못했습니다. 잠시 후 다시 시도해주세요.",
  submitFailureMessage,
  "요청을 확인할 수 없습니다. 페이지를 새로고침해주세요.",
  "허용되지 않은 요청입니다.",
  "요청을 처리할 수 없습니다.",
  "지원하지 않는 요청 형식입니다.",
  "요청 용량이 너무 큽니다.",
]);

export function IntakeShell({
  token,
  bundle,
}: {
  token: string;
  bundle: PublicIntakeBundle;
}) {
  const router = useRouter();
  const [currentStepId, setCurrentStepId] =
    useState<IntakeStepId>(firstIntakeStepId);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<IntakePayloadInput>({
    resolver: zodResolver(intakePayloadSchema),
    defaultValues: bundle.draftPayload ?? {
      schemaVersion: 1,
      answers: {},
      historyEvents: [],
      profileCandidates: bundle.profileCandidates,
      thirdParties: [],
      website: "",
    },
  });
  const answers = useWatch({ control: form.control, name: "answers" }) ?? {};
  const stepIndex = getStepIndex(currentStepId);
  const currentSection = sections[stepIndex] ?? sections[0]!;
  const currentQuestions = bundle.questions.filter(
    (question) =>
      question.key !== "preferred_contact_method" &&
      question.sectionKey === currentSection.key &&
      evaluateQuestionCondition(question.condition, answers),
  );
  const prefilledMap = new Map(
    bundle.prefilledFields.map((field) => [field.fieldKey, field.value]),
  );
  const progress = getIntakeProgress(currentStepId);

  function answerIsEmpty(value: unknown, confirmation: boolean): boolean {
    return (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0) ||
      (confirmation && value === false)
    );
  }

  function validateSection(sectionIndex: number): boolean {
    const section = sections[sectionIndex];
    if (!section) return false;
    const missing = bundle.questions.find(
      (question) =>
        question.sectionKey === section.key &&
        question.required &&
        evaluateQuestionCondition(question.condition, answers) &&
        answerIsEmpty(answers[question.key], question.type === "confirmation"),
    );
    if (!missing) return true;
    setMessage(`‘${missing.label}’ 항목을 확인해주세요.`);
    return false;
  }

  function moveStep(direction: 1 | -1) {
    if (direction === 1 && !validateSection(stepIndex)) return;
    setMessage("");
    setCurrentStepId(
      direction === 1
        ? getNextStepId(currentStepId)
        : getPreviousStepId(currentStepId),
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveDraft() {
    setSaving(true);
    setMessage("");
    try {
      const parsed = safeParseIntakePayload(form.getValues());
      if (!parsed.success) {
        setMessage(draftValidationMessage);
        return;
      }
      const response = await fetch(`/api/intake/${token}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = (await response.json()) as {
        error?: string;
        savedAt?: string;
      };
      if (!response.ok) {
        setMessage(getApprovedServerMessage(result.error, draftFailureMessage));
        return;
      }
      setMessage(
        "현재까지 작성한 내용을 안전하게 저장했습니다. 같은 링크로 이어서 작성할 수 있어요.",
      );
    } catch {
      setMessage(draftFailureMessage);
    } finally {
      setSaving(false);
    }
  }

  async function submitFinal(input: IntakePayloadInput) {
    for (let index = 0; index < sections.length; index += 1) {
      if (!validateSection(index)) {
        setCurrentStepId(sections[index]!.key);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/intake/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intakePayloadSchema.parse(input)),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(
          getApprovedServerMessage(result.error, submitFailureMessage),
        );
        setSubmitting(false);
        return;
      }
      router.replace(`/intake/${token}/complete`);
    } catch {
      setMessage(submitFailureMessage);
      setSubmitting(false);
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    if (!isFinalIntakeStep(currentStepId)) {
      event.preventDefault();
      return;
    }
    void form.handleSubmit(submitFinal)(event);
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={handleFormSubmit}>
        <input
          {...form.register("website")}
          className="sr-only"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        <header className="border-b border-[var(--navy-300)] bg-[var(--neutral-50)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
            <span className="text-lg font-black tracking-[-0.04em]">
              WeThru
            </span>
            <span className="text-xs font-bold tracking-[0.12em] text-[var(--navy-700)]">
              {bundle.caseCode}
            </span>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <main>
            {stepIndex === 0 ? (
              <section className="mb-12 border-l-4 border-[var(--navy-950)] pl-5 sm:pl-7">
                <p className="text-xs font-bold tracking-[0.18em] text-[var(--navy-700)] uppercase">
                  {bundle.businessName} 사전 진단
                </p>
                <div className="mt-5 text-base leading-8 whitespace-pre-line text-[var(--navy-900)]">
                  {bundle.customerIntro}
                </div>
                <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold">
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="size-4" /> 약{" "}
                    {bundle.expectedCompletionMinutes}분
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Save className="size-4" /> 중간 저장 후 같은 링크로
                    이어쓰기
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <LockKeyhole className="size-4" /> 비밀번호·OTP는 받지 않음
                  </span>
                </div>
                <div className="mt-8 flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--navy-700)]">
                  <span>현재 사업장</span>
                  <ArrowRight className="size-3" />
                  <span>과거 흐름</span>
                  <ArrowRight className="size-3" />
                  <span>현재 프로필</span>
                  <ArrowRight className="size-3" />
                  <span>다음 경로</span>
                </div>
              </section>
            ) : null}

            <section>
              <div className="mb-8">
                <p className="text-xs font-black tracking-[0.18em] text-[var(--navy-700)]">
                  {String(stepIndex + 1).padStart(2, "0")} /{" "}
                  {String(sections.length).padStart(2, "0")}
                </p>
                <h1 className="mt-4 text-3xl leading-tight font-black tracking-[-0.05em] sm:text-5xl">
                  {currentSection.title}
                </h1>
                <p className="mt-4 text-sm leading-7 text-[var(--navy-700)]">
                  {currentSection.description}
                </p>
              </div>

              <div className="border-y border-[var(--navy-300)]">
                {currentQuestions.map((question) => (
                  <DynamicQuestion
                    key={question.key}
                    question={question}
                    control={form.control}
                    prefilledValue={
                      question.source === "prefill_confirmation"
                        ? prefilledMap.get(question.sourceKey)
                        : undefined
                    }
                  />
                ))}
                {currentQuestions.length === 0 &&
                currentSection.key !== "profile_candidates" ? (
                  <p className="py-7 text-sm leading-6 text-[var(--navy-700)]">
                    이 사건에서 추가로 확인할 공통 질문은 없습니다.
                  </p>
                ) : null}
              </div>

              {currentSection.key === "history_summary" ? (
                <HistoryTimeline />
              ) : null}
              {currentSection.key === "changes" ? <ThirdPartyList /> : null}
              {currentSection.key === "profile_candidates" ? (
                <ProfileCandidateList />
              ) : null}
              {currentSection.key === "evidence" ? (
                <EvidenceUploader
                  token={token}
                  requestedEvidence={bundle.requestedEvidence}
                  initialFiles={bundle.evidenceFiles}
                />
              ) : null}
              {currentSection.key === "confirmation" ? (
                <SafetyReminder />
              ) : null}
              {currentSection.key === "current_business" ? (
                <KmongContactNotice />
              ) : null}
            </section>

            {message ? (
              <p
                role="status"
                className="mt-7 border-l-2 border-[var(--navy-950)] bg-[var(--neutral-100)] px-4 py-3 text-sm leading-6"
              >
                {message}
              </p>
            ) : null}

            <div className="mt-10 flex flex-col-reverse gap-3 border-t border-[var(--navy-300)] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                disabled={stepIndex === 0}
                onClick={() => moveStep(-1)}
                className="inline-flex min-h-14 items-center justify-center gap-2 px-5 text-sm font-bold disabled:opacity-30"
              >
                <ArrowLeft className="size-4" /> 이전
              </button>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={saving || submitting}
                  onClick={saveDraft}
                  className="inline-flex min-h-14 items-center justify-center gap-2 border border-[var(--navy-950)] px-5 text-sm font-bold disabled:opacity-50"
                >
                  <Save className="size-4" />{" "}
                  {saving ? "저장 중" : "여기까지 저장"}
                </button>
                {!isFinalIntakeStep(currentStepId) ? (
                  <button
                    type="button"
                    onClick={() => moveStep(1)}
                    className="inline-flex min-h-14 items-center justify-center gap-2 bg-[var(--navy-950)] px-6 text-sm font-bold text-white"
                  >
                    다음 질문 <ArrowRight className="size-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="min-h-14 bg-[var(--navy-950)] px-6 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {submitting ? "안전하게 제출 중" : "최종 제출하기"}
                  </button>
                )}
              </div>
            </div>
          </main>

          <aside className="order-first lg:order-none">
            <div className="lg:sticky lg:top-8">
              <div className="h-1 bg-[var(--navy-300)]">
                <div
                  className="h-full bg-[var(--navy-950)] transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-bold">
                <span>진행률</span>
                <span>{progress}%</span>
              </div>
              <ol className="mt-7 hidden space-y-1 lg:block">
                {sections.map((section, index) => (
                  <li key={section.key}>
                    <button
                      type="button"
                      disabled={
                        !canSelectIntakeStep(currentStepId, section.key)
                      }
                      onClick={() => setCurrentStepId(section.key)}
                      className={`w-full border-l-2 px-4 py-3 text-left text-xs leading-5 disabled:cursor-default ${index === stepIndex ? "border-[var(--navy-950)] font-black" : index < stepIndex ? "border-[var(--navy-300)] font-bold text-[var(--navy-700)]" : "border-transparent text-[var(--navy-300)]"}`}
                    >
                      {index + 1}. {section.title}
                    </button>
                  </li>
                ))}
              </ol>
              <p className="mt-7 hidden text-xs leading-5 text-[var(--navy-700)] lg:block">
                정확하지 않아도 괜찮습니다. ‘잘 모르겠어요’ 또는 ‘확인이
                필요해요’를 선택하셔도 됩니다.
              </p>
            </div>
          </aside>
        </div>
      </form>
    </FormProvider>
  );
}

function SafetyReminder() {
  return (
    <div className="mt-8 border-l-2 border-[var(--navy-950)] bg-[var(--neutral-100)] p-5">
      <h3 className="font-black">제출 전에 한 번만 확인해주세요</h3>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--navy-700)]">
        <li>모르는 답은 모른다고 표시해도 괜찮습니다.</li>
        <li>Google 비밀번호, OTP, 복구 코드는 제출하지 않습니다.</li>
        <li>
          현재 유료 사건은 정해진 한 사업장에 적용되며, 추가 사업장은 별도
          사건입니다.
        </li>
        <li>Google 결정을 우회하기 위한 반복 생성은 포함되지 않습니다.</li>
        <li>
          이 진단은 승인, 복구, 노출, 삭제 또는 소유권 이전을 보장하지 않습니다.
        </li>
      </ul>
    </div>
  );
}

function KmongContactNotice() {
  return (
    <div className="mt-8 border-l-2 border-[var(--navy-950)] bg-[var(--neutral-100)] p-5 text-sm leading-6 text-[var(--navy-700)]">
      <p className="font-black text-[var(--navy-950)]">연락 방법 안내</p>
      <p className="mt-2">
        크몽을 통해 접수한 상담은 크몽 메시지에서만 이어갑니다. 전화·문자·
        카카오톡·이메일 등 외부 연락 방법은 별도로 선택하거나 요청하지 않습니다.
      </p>
    </div>
  );
}

function getApprovedServerMessage(
  message: string | undefined,
  fallback: string,
): string {
  return message && approvedServerMessages.has(message) ? message : fallback;
}
