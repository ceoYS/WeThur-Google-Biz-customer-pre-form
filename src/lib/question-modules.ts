import { z } from "zod";

export const questionnaireSectionKeys = [
  "current_business",
  "history_summary",
  "changes",
  "profile_candidates",
  "evidence",
  "goals",
  "confirmation",
] as const;

export type QuestionnaireSectionKey = (typeof questionnaireSectionKeys)[number];

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
    sectionKey: z.enum(questionnaireSectionKeys),
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

const sectionOrder = new Map(
  questionnaireSectionKeys.map((section, index) => [section, index]),
);

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
    if (seenKeys.has(parsed.key)) {
      throw new Error(`Duplicate custom question key: ${parsed.key}`);
    }
    seenKeys.add(parsed.key);
    composed.push({ ...parsed, source: "custom", sourceKey: parsed.key });
  }

  for (const prefill of options.prefilledConfirmations ?? []) {
    const key = `confirm_${prefill.fieldKey}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    composed.push({
      key,
      sectionKey: "current_business",
      label: prefill.label,
      helpText: "미리 확인한 내용입니다. 다르면 편하게 수정해주세요.",
      type: "confirmation",
      options: ["맞아요", "수정이 필요해요", "잘 모르겠어요"],
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
