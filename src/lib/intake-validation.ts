import type { ComposedQuestion } from "@/lib/question-modules";
import { evaluateQuestionCondition } from "@/lib/question-modules";

export type RequiredAnswerIssue = { key: string; label: string };

export function findMissingRequiredAnswers(
  questions: ComposedQuestion[],
  answers: Record<string, unknown>,
): RequiredAnswerIssue[] {
  return questions.flatMap((question) => {
    if (
      !question.required ||
      !evaluateQuestionCondition(question.condition, answers)
    ) {
      return [];
    }
    const value = answers[question.key];
    const empty =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0) ||
      (question.type === "confirmation" && value !== true);
    return empty ? [{ key: question.key, label: question.label }] : [];
  });
}

export function canSubmitIntake(status: string): boolean {
  return status === "link_ready" || status === "draft" || status === "reopened";
}
