import { z } from "zod";

import { intakeStepIds } from "@/lib/intake-steps";
import { isCredentialCollectionQuestion } from "@/lib/question-modules";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .optional()
    .transform((value) => value || undefined);

const optionalUrl = z
  .union([z.literal(""), z.url().max(2_000)])
  .optional()
  .transform((value) => value || undefined);

export const knownFactSchema = z.object({
  fieldKey: z
    .string()
    .regex(/^[a-z0-9_]+$/)
    .max(80),
  value: z.string().trim().min(1).max(2_000),
  sourceType: z
    .enum([
      "admin_prefill",
      "customer_statement",
      "document",
      "public_source",
      "unknown",
    ])
    .default("admin_prefill"),
  sourceNote: optionalText(500),
  customerCanEdit: z.boolean().default(true),
});

export const profileCandidateSetupSchema = z.object({
  existingId: z.uuid().optional(),
  mapsUrl: optionalUrl,
  displayedName: z.string().trim().min(1).max(200),
  displayedAddress: optionalText(500),
  displayedFloor: optionalText(100),
  displayedPhone: optionalText(100),
  displayedWebsite: optionalUrl,
  displayedCategory: optionalText(200),
  relationNotes: optionalText(2_000),
});

export const customQuestionSetupSchema = z
  .object({
    sectionKey: z.enum(intakeStepIds),
    questionKey: z
      .string()
      .regex(/^[a-z0-9_]+$/)
      .max(80),
    label: z.string().trim().min(1).max(500),
    helpText: optionalText(1_000),
    questionType: z.enum([
      "text",
      "textarea",
      "single_select",
      "multi_select",
      "boolean",
      "date_period",
      "number",
      "confirmation",
    ]),
    choices: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
    required: z.boolean().default(false),
    conditionalLogic: z.record(z.string(), z.unknown()).default({}),
  })
  .superRefine((question, context) => {
    if (
      isCredentialCollectionQuestion({
        key: question.questionKey,
        label: question.label,
        helpText: question.helpText,
        type: question.questionType,
      })
    ) {
      context.addIssue({
        code: "custom",
        path: ["questionKey"],
        message: "Credential questions are not permitted.",
      });
    }
  });

export const requestedEvidenceSetupSchema = z.object({
  evidenceCategory: z
    .string()
    .regex(/^[a-z0-9_]+$/)
    .max(80),
  label: z.string().trim().min(1).max(200),
  helpText: optionalText(500),
  required: z.boolean().default(false),
});

export const createCaseSchema = z
  .object({
    businessName: z.string().trim().min(1).max(200),
    industryKey: z
      .string()
      .regex(/^[a-z0-9_-]+$/)
      .max(80),
    customerName: optionalText(120),
    customerPhone: optionalText(100),
    customerContactChannel: optionalText(120),
    customerIntro: z.string().trim().min(20).max(5_000),
    expectedCompletionMinutes: z.coerce.number().int().min(5).max(180),
    moduleIds: z.array(z.uuid()).min(1).max(30),
    knownFacts: z.array(knownFactSchema).max(50).default([]),
    profileCandidates: z.array(profileCandidateSetupSchema).max(10).default([]),
    customQuestions: z.array(customQuestionSetupSchema).max(30).default([]),
    requestedEvidence: z
      .array(requestedEvidenceSetupSchema)
      .max(30)
      .default([]),
    assignedAdminId: z.uuid().optional(),
    website: z.literal("").optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const keys = value.knownFacts.map((fact) => fact.fieldKey);
    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: "custom",
        path: ["knownFacts"],
        message: "Known fact keys must be unique.",
      });
    }
    const questionKeys = value.customQuestions.map(
      (question) => question.questionKey,
    );
    if (new Set(questionKeys).size !== questionKeys.length) {
      context.addIssue({
        code: "custom",
        path: ["customQuestions"],
        message: "Custom question keys must be unique.",
      });
    }
  });

export type CreateCaseInput = z.input<typeof createCaseSchema>;
export type ValidatedCreateCaseInput = z.output<typeof createCaseSchema>;

export const tokenMutationSchema = z.object({
  action: z.enum(["regenerate", "revoke"]),
});
