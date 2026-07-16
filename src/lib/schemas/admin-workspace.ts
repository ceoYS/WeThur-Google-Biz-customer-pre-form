import { z } from "zod";

const nullableText = (max: number) =>
  z.union([z.string().trim().max(max), z.null()]).optional();

export const historyEventAdminSchema = z
  .object({
    approximate_period: nullableText(500),
    handled_by: nullableText(500),
    handler_type: nullableText(500),
    account_label: nullableText(500),
    profile_name: nullableText(500),
    address: nullableText(500),
    floor: nullableText(500),
    map_pin_notes: nullableText(5_000),
    phone: nullableText(500),
    website: nullableText(2_000),
    primary_category: nullableText(500),
    additional_categories: z
      .array(z.string().trim().max(200))
      .max(20)
      .optional(),
    verification_method: nullableText(500),
    approval_status: nullableText(500),
    final_result: nullableText(5_000),
    google_message: nullableText(5_000),
    changes_before_result: nullableText(5_000),
    appeal_pending_when_recreated: nullableText(500),
    same_account_other_suspensions: nullableText(500),
    ownership_change_notes: nullableText(5_000),
    evidence_notes: nullableText(5_000),
    admin_normalization_note: nullableText(5_000),
  })
  .strict();

export const reorderHistorySchema = z
  .object({ eventIds: z.array(z.uuid()).max(10) })
  .strict()
  .refine((value) => new Set(value.eventIds).size === value.eventIds.length, {
    message: "History event identifiers must be unique.",
  });

export const diagnosisDecisionSchema = z
  .object({
    adminDecisionPath: z
      .enum(["A", "B", "C", "D", "E", "F", "G", "H"])
      .nullable(),
    adminConclusion: z.string().trim().max(10_000),
  })
  .strict();

export const factReviewSchema = z
  .object({
    verificationStatus: z.enum([
      "confirmed",
      "customer_statement",
      "inference",
      "unknown",
      "conflicting",
    ]),
    adminNote: z.string().trim().max(5_000),
  })
  .strict();

export const createFollowUpSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    message: z.string().trim().min(1).max(5_000),
    requestedItems: z.array(z.string().trim().min(1).max(500)).max(30),
  })
  .strict();

export const updateFollowUpSchema = z
  .object({
    status: z.enum(["draft", "sent", "responded", "resolved", "cancelled"]),
    customerResponse: z.string().trim().max(5_000),
  })
  .strict()
  .refine(
    (value) => value.status !== "responded" || Boolean(value.customerResponse),
    { path: ["customerResponse"], message: "A response is required." },
  );
