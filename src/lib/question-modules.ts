import { z } from "zod";

import { intakeStepIds, type IntakeStepId } from "@/lib/intake-steps";

// `goals` is accepted only while reading cases configured before the customer-ready
// migration. It is never composed into the current customer flow.
export const supportedQuestionnaireSectionKeys = [
  ...intakeStepIds,
  "goals",
] as const;
export type QuestionnaireSectionKey =
  (typeof supportedQuestionnaireSectionKeys)[number];

export const retiredCustomerQuestionKeys = new Set([
  "customer_preferred_title",
  "desired_standard_name",
  "keyword_name_history",
  "third_party_involvement",
  "evidence_availability",
  "sensitive_data_confirmation",
  "priority_goals",
  "success_definition",
  "process_expectation",
  "future_location_standard",
  "duplicate_relation_basis",
  "unknown_owner_access",
  "ownership_request_history",
  "map_pin_difference",
  "manager_role_summary",
]);

export const questionTypeSchema = z.enum([
  "text",
  "textarea",
  "single_select",
  "multi_select",
  "boolean",
  "number",
  "date_period",
  "confirmation",
]);

export const conditionSchema = z
  .object({
    field: z.string().min(1),
    operator: z.enum(["equals", "not_equals", "in", "contains", "answered"]),
    value: z.unknown().optional(),
  })
  .strict();

export const questionDefinitionSchema = z
  .object({
    key: z.string().regex(/^[a-z0-9_]+$/),
    sectionKey: z.enum(supportedQuestionnaireSectionKeys),
    label: z.string().min(1),
    helpText: z.string().optional(),
    type: questionTypeSchema,
    options: z.array(z.string()).default([]),
    required: z.boolean().default(false),
    sortOrder: z.number().int().nonnegative().default(0),
    condition: conditionSchema.optional(),
  })
  .strict()
  .superRefine((question, context) => {
    if (isCredentialCollectionQuestion(question)) {
      context.addIssue({
        code: "custom",
        path: ["key"],
        message: "Credential questions are not permitted.",
      });
    }
  });

export const moduleSchemaJsonSchema = z
  .object({
    version: z.number().int().positive(),
    questions: z.array(questionDefinitionSchema),
  })
  .strict();

export type QuestionDefinition = z.infer<typeof questionDefinitionSchema>;
export type QuestionCondition = z.infer<typeof conditionSchema>;

const credentialPattern =
  /password|otp|recovery[_ ]?code|비밀번호|인증번호|복구\s*코드/i;
const safetyNegationPattern =
  /제출하지|입력하지|요청하지|공유하지|보내지|받지|금지|do not|don't|must not|never/i;

export function isCredentialCollectionQuestion(input: {
  key: string;
  label: string;
  helpText?: string;
  type: z.infer<typeof questionTypeSchema>;
}) {
  if (credentialPattern.test(input.key)) return true;
  const wording = `${input.label} ${input.helpText ?? ""}`;
  if (!credentialPattern.test(wording)) return false;
  return !safetyNegationPattern.test(wording);
}

export type SelectedQuestionModule = {
  moduleKey: string;
  moduleType: "common" | "industry" | "issue";
  sortOrder: number;
  schemaJson: unknown;
};

export type ComposedQuestion = QuestionDefinition & {
  source: "module" | "custom" | "prefill_confirmation";
  sourceKey: string;
};

const sectionOrder = new Map<QuestionnaireSectionKey, number>(
  intakeStepIds.map((section, index) => [section, index]),
);

function isCurrentCustomerQuestion(question: QuestionDefinition) {
  return (
    question.sectionKey !== "goals" &&
    !retiredCustomerQuestionKeys.has(question.key)
  );
}

export function evaluateQuestionCondition(
  condition: QuestionCondition | undefined,
  answers: Record<string, unknown>,
): boolean {
  if (!condition) return true;
  const answer = answers[condition.field];

  switch (condition.operator) {
    case "equals":
      return answer === condition.value;
    case "not_equals":
      return answer !== condition.value;
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(answer);
    case "contains":
      return Array.isArray(answer) && answer.includes(condition.value);
    case "answered":
      return answer !== undefined && answer !== null && answer !== "";
  }
}

export function composeQuestionModules(options: {
  modules: SelectedQuestionModule[];
  customQuestions?: QuestionDefinition[];
  prefilledConfirmations?: Array<{
    fieldKey: string;
    label: string;
    sortOrder: number;
    sectionKey?: IntakeStepId;
  }>;
}): ComposedQuestion[] {
  const composed: ComposedQuestion[] = [];
  const seenKeys = new Set<string>();
  const sortedModules = options.modules.toSorted(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      left.moduleKey.localeCompare(right.moduleKey),
  );

  for (const selectedModule of sortedModules) {
    const schema = moduleSchemaJsonSchema.parse(selectedModule.schemaJson);
    for (const question of schema.questions) {
      if (!isCurrentCustomerQuestion(question)) continue;
      if (seenKeys.has(question.key)) continue;
      seenKeys.add(question.key);
      composed.push({
        ...question,
        source: "module",
        sourceKey: selectedModule.moduleKey,
      });
    }
  }

  for (const question of options.customQuestions ?? []) {
    const parsed = questionDefinitionSchema.parse(question);
    if (!isCurrentCustomerQuestion(parsed)) continue;
    if (seenKeys.has(parsed.key)) {
      throw new Error(`Duplicate custom question key: ${parsed.key}`);
    }
    seenKeys.add(parsed.key);
    composed.push({ ...parsed, source: "custom", sourceKey: parsed.key });
  }

  for (const prefill of options.prefilledConfirmations ?? []) {
    const key = prefill.fieldKey;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    composed.push({
      key,
      sectionKey: prefill.sectionKey ?? "current_business",
      label: prefill.label,
      helpText:
        "값을 처음부터 다시 입력하실 필요 없이, 다른 부분만 고쳐주세요.",
      type: "text",
      options: [],
      required: false,
      sortOrder: prefill.sortOrder,
      source: "prefill_confirmation",
      sourceKey: prefill.fieldKey,
    });
  }

  return composed.toSorted((left, right) => {
    const leftSection = sectionOrder.get(left.sectionKey) ?? 99;
    const rightSection = sectionOrder.get(right.sectionKey) ?? 99;
    return leftSection - rightSection || left.sortOrder - right.sortOrder;
  });
}
