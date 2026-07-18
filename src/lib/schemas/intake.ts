import { z } from "zod";

const optionalShortText = z.string().trim().max(500).optional().default("");
const optionalLongText = z.string().trim().max(5_000).optional().default("");
const optionalUrlText = z
  .union([z.literal(""), z.url().max(2_000)])
  .optional()
  .default("");
const optionalEmailText = z
  .union([z.literal(""), z.email().max(254)])
  .optional()
  .default("");

const answerValueSchema = z.union([
  z.string().max(5_000),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(500)).max(50),
  z.null(),
]);

export const historyEventInputSchema = z
  .object({
    clientId: z.uuid(),
    approximatePeriod: optionalShortText,
    periodUnknown: z.boolean().default(false),
    handledBy: optionalShortText,
    handlerUnknown: z.boolean().default(false),
    handlerType: optionalShortText,
    profileName: optionalShortText,
    result: optionalShortText,
    accountLabel: optionalShortText,
    accountEmail: optionalEmailText,
    address: optionalShortText,
    floor: optionalShortText,
    mapPinNotes: optionalLongText,
    phone: optionalShortText,
    website: optionalUrlText,
    primaryCategory: optionalShortText,
    additionalCategories: z.array(z.string().max(200)).max(20).default([]),
    verificationMethod: optionalShortText,
    approvalStatus: optionalShortText,
    finalResult: optionalLongText,
    googleMessage: optionalLongText,
    changesBeforeResult: optionalLongText,
    appealPendingWhenRecreated: optionalShortText,
    sameAccountOtherSuspensions: optionalShortText,
    ownershipChangeNotes: optionalLongText,
    evidenceNotes: optionalLongText,
  })
  .strict();

export const profileCandidateInputSchema = z
  .object({
    existingId: z.uuid().optional(),
    clientId: z.uuid(),
    mapsUrl: optionalUrlText,
    displayedName: optionalShortText,
    displayedAddress: optionalShortText,
    displayedFloor: optionalShortText,
    mapPinNotes: optionalLongText,
    displayedPhone: optionalShortText,
    displayedWebsite: optionalUrlText,
    displayedCategory: optionalShortText,
    rating: z
      .union([z.literal(""), z.coerce.number().min(0).max(5)])
      .optional()
      .default(""),
    reviewCount: z
      .union([z.literal(""), z.coerce.number().int().min(0).max(10_000_000)])
      .optional()
      .default(""),
    possibleCreator: optionalShortText,
    customerControlsProfile: optionalShortText,
    ownershipRequestStatus: optionalShortText,
    relationNotes: optionalLongText,
    independentBusinessSignals: z
      .record(
        z.string(),
        z.enum([
          "yes",
          "no",
          "unknown",
          "not_applicable",
          "needs_confirmation",
        ]),
      )
      .default({}),
  })
  .strict();

export const thirdPartyInputSchema = z
  .object({
    clientId: z.uuid(),
    partyName: optionalShortText,
    partyType: optionalShortText,
    approximatePeriod: optionalShortText,
    workRequested: optionalLongText,
    accountAccessLevel: optionalShortText,
    changesMade: z.array(z.string().max(200)).max(30).default([]),
    notes: optionalLongText,
  })
  .strict();

export const intakePayloadSchema = z
  .object({
    schemaVersion: z.literal(1),
    answers: z.record(z.string().regex(/^[a-z0-9_]+$/), answerValueSchema),
    historyEvents: z.array(historyEventInputSchema).max(10),
    profileCandidates: z.array(profileCandidateInputSchema).max(10),
    thirdParties: z.array(thirdPartyInputSchema).max(10),
    website: z.literal("").optional().default(""),
  })
  .strict()
  .superRefine((value, context) => {
    if (Object.keys(value.answers).length > 300) {
      context.addIssue({
        code: "custom",
        path: ["answers"],
        message: "Too many answer fields.",
      });
    }
    const forbiddenAnswerKey = /password|otp|recovery[_ ]?code/i;
    if (
      Object.keys(value.answers).some((key) => forbiddenAnswerKey.test(key))
    ) {
      context.addIssue({
        code: "custom",
        path: ["answers"],
        message: "Credential fields are not permitted.",
      });
    }
    for (const [collectionName, collection] of [
      ["historyEvents", value.historyEvents],
      ["profileCandidates", value.profileCandidates],
      ["thirdParties", value.thirdParties],
    ] as const) {
      const ids = collection.map((item) => item.clientId);
      if (new Set(ids).size !== ids.length) {
        context.addIssue({
          code: "custom",
          path: [collectionName],
          message: "Item identifiers must be unique.",
        });
      }
    }
  });

export type IntakePayloadInput = z.input<typeof intakePayloadSchema>;
export type ValidatedIntakePayload = z.output<typeof intakePayloadSchema>;

export function safeParseIntakePayload(input: unknown) {
  return intakePayloadSchema.safeParse(withoutUndefinedAnswers(input));
}

function withoutUndefinedAnswers(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const answers = (input as { answers?: unknown }).answers;
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return input;
  }
  return {
    ...input,
    answers: Object.fromEntries(
      Object.entries(answers).filter(([, value]) => value !== undefined),
    ),
  };
}

export const evidenceUploadMetadataSchema = z
  .object({
    evidenceCategory: z
      .string()
      .regex(/^[a-z0-9_]+$/)
      .max(80),
    customerDescription: z.string().trim().max(2_000).optional().default(""),
    linkType: z.enum(["history_event", "profile_candidate"]).optional(),
    linkClientId: z.uuid().optional(),
  })
  .superRefine((value, context) => {
    if (Boolean(value.linkType) !== Boolean(value.linkClientId)) {
      context.addIssue({
        code: "custom",
        path: ["linkType"],
        message: "Evidence link type and reference must be provided together.",
      });
    }
  });

export function createEmptyHistoryEvent(): z.input<
  typeof historyEventInputSchema
> {
  return {
    clientId: crypto.randomUUID(),
    approximatePeriod: "",
    periodUnknown: false,
    handledBy: "",
    handlerUnknown: false,
    handlerType: "",
    profileName: "",
    result: "",
    accountLabel: "",
    accountEmail: "",
    address: "",
    floor: "",
    mapPinNotes: "",
    phone: "",
    website: "",
    primaryCategory: "",
    additionalCategories: [],
    verificationMethod: "",
    approvalStatus: "",
    finalResult: "",
    googleMessage: "",
    changesBeforeResult: "",
    appealPendingWhenRecreated: "",
    sameAccountOtherSuspensions: "",
    ownershipChangeNotes: "",
    evidenceNotes: "",
  };
}

export function createEmptyProfileCandidate(): z.input<
  typeof profileCandidateInputSchema
> {
  return {
    clientId: crypto.randomUUID(),
    mapsUrl: "",
    displayedName: "",
    displayedAddress: "",
    displayedFloor: "",
    mapPinNotes: "",
    displayedPhone: "",
    displayedWebsite: "",
    displayedCategory: "",
    rating: "",
    reviewCount: "",
    possibleCreator: "",
    customerControlsProfile: "",
    ownershipRequestStatus: "",
    relationNotes: "",
    independentBusinessSignals: {},
  };
}

export function createEmptyThirdParty(): z.input<typeof thirdPartyInputSchema> {
  return {
    clientId: crypto.randomUUID(),
    partyName: "",
    partyType: "",
    approximatePeriod: "",
    workRequested: "",
    accountAccessLevel: "",
    changesMade: [],
    notes: "",
  };
}
