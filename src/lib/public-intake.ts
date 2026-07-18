import "server-only";

import { getServerEnvironment } from "@/lib/env.server";
import { resolveIntakeProfileCandidates } from "@/lib/intake-profile-candidates";
import {
  composeQuestionModules,
  conditionSchema,
  questionDefinitionSchema,
  type ComposedQuestion,
  type QuestionDefinition,
  type SelectedQuestionModule,
} from "@/lib/question-modules";
import {
  intakePayloadSchema,
  type IntakePayloadInput,
} from "@/lib/schemas/intake";
import { prefillFieldPresentation } from "@/lib/required-information";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { hashIntakeToken, intakeTokenSchema } from "@/lib/tokens";

type CaseRow = {
  id: string;
  case_code: string;
  business_name: string;
  customer_intro: string;
  expected_completion_minutes: number;
  intake_status: "link_ready" | "draft" | "submitted" | "reopened";
};

type ModuleLinkRow = {
  sort_order: number;
  question_modules:
    | {
        module_key: string;
        module_type: "common" | "industry" | "issue";
        schema_json: unknown;
      }
    | Array<{
        module_key: string;
        module_type: "common" | "industry" | "issue";
        schema_json: unknown;
      }>
    | null;
};

type CustomQuestionRow = {
  question_key: string;
  section_key: QuestionDefinition["sectionKey"];
  label: string;
  help_text: string | null;
  question_type: QuestionDefinition["type"];
  choices: unknown;
  required: boolean;
  conditional_logic: unknown;
  sort_order: number;
};

type PrefillRow = {
  field_key: string;
  field_value: unknown;
  customer_can_edit: boolean;
};

type CandidateRow = {
  id: string;
  maps_url: string | null;
  displayed_name: string | null;
  displayed_address: string | null;
  displayed_floor: string | null;
  map_pin_notes: string | null;
  displayed_phone: string | null;
  displayed_website: string | null;
  displayed_category: string | null;
  rating: number | null;
  review_count: number | null;
  relation_notes: string | null;
};

type RequestedEvidenceRow = {
  evidence_category: string;
  label: string;
  help_text: string | null;
  required: boolean;
};

type DraftRow = { draft_payload: unknown };
type EvidenceRow = {
  id: string;
  evidence_category: string;
  original_filename: string;
  size_bytes: number;
  customer_description: string | null;
  customer_link_type: "history_event" | "profile_candidate" | null;
  customer_link_client_id: string | null;
};

export type PublicPrefilledField = {
  fieldKey: string;
  value: unknown;
  customerCanEdit: boolean;
};

export type PublicRequestedEvidence = {
  category: string;
  label: string;
  helpText: string | null;
  required: boolean;
};

export type PublicEvidenceFile = {
  id: string;
  category: string;
  originalFilename: string;
  sizeBytes: number;
  customerDescription: string | null;
  linkType: "history_event" | "profile_candidate" | null;
  linkClientId: string | null;
};

export type PublicIntakeBundle = {
  caseCode: string;
  businessName: string;
  customerIntro: string;
  expectedCompletionMinutes: number;
  intakeStatus: CaseRow["intake_status"];
  questions: ComposedQuestion[];
  prefilledFields: PublicPrefilledField[];
  profileCandidates: IntakePayloadInput["profileCandidates"];
  requestedEvidence: PublicRequestedEvidence[];
  evidenceFiles: PublicEvidenceFile[];
  draftPayload: IntakePayloadInput | null;
};

function mapCustomQuestion(row: CustomQuestionRow): QuestionDefinition | null {
  const choices = Array.isArray(row.choices)
    ? row.choices.filter(
        (choice): choice is string => typeof choice === "string",
      )
    : [];
  const conditionResult = conditionSchema.safeParse(row.conditional_logic);
  const result = questionDefinitionSchema.safeParse({
    key: row.question_key,
    sectionKey: row.section_key,
    label: row.label,
    helpText: row.help_text ?? undefined,
    type: row.question_type,
    choices,
    required: row.required,
    sortOrder: row.sort_order,
    condition:
      row.conditional_logic &&
      typeof row.conditional_logic === "object" &&
      Object.keys(row.conditional_logic).length > 0 &&
      conditionResult.success
        ? conditionResult.data
        : undefined,
  });
  return result.success ? result.data : null;
}

export async function loadPublicIntakeBundle(
  rawToken: string,
): Promise<PublicIntakeBundle | null> {
  const tokenResult = intakeTokenSchema.safeParse(rawToken);
  if (!tokenResult.success) return null;

  const tokenHash = hashIntakeToken(
    tokenResult.data,
    getServerEnvironment().TOKEN_HASH_SECRET,
  );
  const service = createServiceRoleClient();
  const { data: caseData, error } = await service
    .from("cases")
    .select(
      "id, case_code, business_name, customer_intro, expected_completion_minutes, intake_status",
    )
    .eq("token_hash", tokenHash)
    .eq("token_status", "active")
    .maybeSingle<CaseRow>();
  if (error || !caseData) return null;

  const [
    moduleResult,
    customResult,
    prefillResult,
    candidateResult,
    evidenceResult,
    filesResult,
    draftResult,
  ] = await Promise.all([
    service
      .from("case_modules")
      .select(
        "sort_order, question_modules(module_key, module_type, schema_json)",
      )
      .eq("case_id", caseData.id)
      .order("sort_order")
      .returns<ModuleLinkRow[]>(),
    service
      .from("case_custom_questions")
      .select(
        "question_key, section_key, label, help_text, question_type, choices, required, conditional_logic, sort_order",
      )
      .eq("case_id", caseData.id)
      .order("sort_order")
      .returns<CustomQuestionRow[]>(),
    service
      .from("case_prefilled_fields")
      .select("field_key, field_value, customer_can_edit")
      .eq("case_id", caseData.id)
      .returns<PrefillRow[]>(),
    service
      .from("current_profile_candidates")
      .select(
        "id, maps_url, displayed_name, displayed_address, displayed_floor, map_pin_notes, displayed_phone, displayed_website, displayed_category, rating, review_count, relation_notes",
      )
      .eq("case_id", caseData.id)
      .order("sort_order")
      .returns<CandidateRow[]>(),
    service
      .from("case_requested_evidence")
      .select("evidence_category, label, help_text, required")
      .eq("case_id", caseData.id)
      .order("sort_order")
      .returns<RequestedEvidenceRow[]>(),
    service
      .from("case_evidence")
      .select(
        "id, evidence_category, original_filename, size_bytes, customer_description, customer_link_type, customer_link_client_id",
      )
      .eq("case_id", caseData.id)
      .eq("uploaded_by_type", "customer")
      .order("created_at")
      .returns<EvidenceRow[]>(),
    service
      .from("case_intake_responses")
      .select("draft_payload")
      .eq("case_id", caseData.id)
      .maybeSingle<DraftRow>(),
  ]);

  if (
    moduleResult.error ||
    customResult.error ||
    prefillResult.error ||
    candidateResult.error ||
    evidenceResult.error ||
    filesResult.error
  ) {
    return null;
  }

  const modules: SelectedQuestionModule[] = (moduleResult.data ?? []).flatMap(
    (link) => {
      const related = Array.isArray(link.question_modules)
        ? link.question_modules[0]
        : link.question_modules;
      return related
        ? [
            {
              moduleKey: related.module_key,
              moduleType: related.module_type,
              sortOrder: link.sort_order,
              schemaJson: related.schema_json,
            },
          ]
        : [];
    },
  );
  const customQuestions = (customResult.data ?? [])
    .map(mapCustomQuestion)
    .filter((question): question is QuestionDefinition => Boolean(question));
  const prefilledRows = prefillResult.data ?? [];
  const questions = composeQuestionModules({
    modules,
    customQuestions,
    prefilledConfirmations: prefilledRows
      .filter((field) => field.customer_can_edit)
      .map((field, index) => ({
        fieldKey: field.field_key,
        label:
          prefillFieldPresentation[field.field_key]?.label ??
          `미리 확인한 ${field.field_key} 값입니다. 맞는지 확인하고 다르면 수정해주세요.`,
        sectionKey: prefillFieldPresentation[field.field_key]?.sectionKey,
        sortOrder: 5 + index,
      })),
  });
  const draft = intakePayloadSchema.safeParse(draftResult.data?.draft_payload);
  const configuredProfileCandidates: IntakePayloadInput["profileCandidates"] = (
    candidateResult.data ?? []
  ).map((candidate) => ({
    existingId: candidate.id,
    // A configured candidate keeps one stable customer reference across reloads,
    // so evidence linked before a draft save still attaches on final submission.
    clientId: candidate.id,
    mapsUrl: candidate.maps_url ?? "",
    displayedName: candidate.displayed_name ?? "",
    displayedAddress: candidate.displayed_address ?? "",
    displayedFloor: candidate.displayed_floor ?? "",
    mapPinNotes: candidate.map_pin_notes ?? "",
    displayedPhone: candidate.displayed_phone ?? "",
    displayedWebsite: candidate.displayed_website ?? "",
    displayedCategory: candidate.displayed_category ?? "",
    rating: candidate.rating ?? "",
    reviewCount: candidate.review_count ?? "",
    possibleCreator: "",
    customerControlsProfile: "",
    ownershipRequestStatus: "",
    relationNotes: candidate.relation_notes ?? "",
    independentBusinessSignals: {},
  }));
  const draftPayload = draft.success
    ? {
        ...draft.data,
        profileCandidates: resolveIntakeProfileCandidates({
          intakeStatus: caseData.intake_status,
          configured: configuredProfileCandidates,
          draft: draft.data.profileCandidates,
        }),
      }
    : null;

  return {
    caseCode: caseData.case_code,
    businessName: caseData.business_name,
    customerIntro: caseData.customer_intro,
    expectedCompletionMinutes: caseData.expected_completion_minutes,
    intakeStatus: caseData.intake_status,
    questions,
    prefilledFields: prefilledRows.map((field) => ({
      fieldKey: field.field_key,
      value: field.field_value,
      customerCanEdit: field.customer_can_edit,
    })),
    profileCandidates: configuredProfileCandidates,
    requestedEvidence: (evidenceResult.data ?? []).map((evidence) => ({
      category: evidence.evidence_category,
      label: evidence.label,
      helpText: evidence.help_text,
      required: evidence.required,
    })),
    evidenceFiles: (filesResult.data ?? []).map((file) => ({
      id: file.id,
      category: file.evidence_category,
      originalFilename: file.original_filename,
      sizeBytes: file.size_bytes,
      customerDescription: file.customer_description,
      linkType: file.customer_link_type,
      linkClientId: file.customer_link_client_id,
    })),
    draftPayload,
  };
}
