import "server-only";

import type { ModuleOption } from "@/components/admin/case-creation-form";
import type { CurrentAdmin } from "@/lib/admin-auth";
import type {
  CreateCaseInput,
  ValidatedCreateCaseInput,
} from "@/lib/schemas/case";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CaseSetupIntakeStatus =
  | "link_ready"
  | "draft"
  | "submitted"
  | "reopened";

export const caseSetupUnavailableMessage =
  "고객이 이미 작성을 시작했거나 제출을 완료한 사건은 현재 원본 설정의 일부가 고객 답변 데이터로 전환되어 전체 설정을 안전하게 복제할 수 없습니다.";

export const caseSetupCreateNewMessage =
  "신규 사건 생성 화면에서 필요한 설정을 다시 확인하여 새 사건을 만들어주세요.";

export function canChangeCaseSetup(status: string): boolean {
  return status === "link_ready";
}

type CaseRow = {
  id: string;
  case_code: string;
  business_name: string;
  industry_key: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_contact_channel: string | null;
  customer_intro: string;
  expected_completion_minutes: number;
  assigned_admin_id: string | null;
  intake_status: CaseSetupIntakeStatus;
};

type ModuleRow = {
  id: string;
  module_key: string;
  module_type: "common" | "industry" | "issue";
  title: string;
  description: string;
};

type AdminRow = { user_id: string; display_name: string | null; email: string };

type FactRow = {
  field_key: string;
  field_value: unknown;
  source_type:
    | "admin_prefill"
    | "customer_statement"
    | "document"
    | "public_source"
    | "unknown";
  source_note: string | null;
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
  rating: number | string | null;
  review_count: number | null;
  possible_creator: string | null;
  customer_controls_profile: string | null;
  ownership_request_status: string | null;
  relation_notes: string | null;
  independent_business_signals: unknown;
};

type CustomRow = {
  section_key:
    | ValidatedCreateCaseInput["customQuestions"][number]["sectionKey"]
    | "goals";
  question_key: string;
  label: string;
  help_text: string | null;
  question_type: ValidatedCreateCaseInput["customQuestions"][number]["questionType"];
  choices: unknown;
  required: boolean;
  conditional_logic: unknown;
};

type RequestedRow = {
  evidence_category: string;
  label: string;
  help_text: string | null;
  required: boolean;
};

export type CaseSetupData = {
  case: Pick<CaseRow, "id" | "case_code" | "business_name" | "intake_status">;
  modules: ModuleOption[];
  admins: Array<{ id: string; label: string }>;
  initialValues: CreateCaseInput;
};

export async function loadCaseSetup(
  caseId: string,
  admin: CurrentAdmin,
): Promise<CaseSetupData | null> {
  const supabase = await createServerSupabaseClient();
  const [
    caseResult,
    moduleResult,
    selectedResult,
    adminResult,
    factResult,
    candidateResult,
    customResult,
    requestedResult,
  ] = await Promise.all([
    supabase
      .from("cases")
      .select(
        "id, case_code, business_name, industry_key, customer_name, customer_phone, customer_contact_channel, customer_intro, expected_completion_minutes, assigned_admin_id, intake_status",
      )
      .eq("id", caseId)
      .maybeSingle<CaseRow>(),
    supabase
      .from("question_modules")
      .select("id, module_key, module_type, title, description")
      .eq("is_active", true)
      .order("module_type")
      .order("title")
      .returns<ModuleRow[]>(),
    supabase
      .from("case_modules")
      .select("module_id")
      .eq("case_id", caseId)
      .order("sort_order")
      .returns<Array<{ module_id: string }>>(),
    supabase
      .from("admin_profiles")
      .select("user_id, display_name, email")
      .order("email")
      .returns<AdminRow[]>(),
    supabase
      .from("case_prefilled_fields")
      .select(
        "field_key, field_value, source_type, source_note, customer_can_edit",
      )
      .eq("case_id", caseId)
      .order("created_at")
      .returns<FactRow[]>(),
    supabase
      .from("current_profile_candidates")
      .select(
        "id, maps_url, displayed_name, displayed_address, displayed_floor, map_pin_notes, displayed_phone, displayed_website, displayed_category, rating, review_count, possible_creator, customer_controls_profile, ownership_request_status, relation_notes, independent_business_signals",
      )
      .eq("case_id", caseId)
      .is("customer_client_id", null)
      .order("sort_order")
      .returns<CandidateRow[]>(),
    supabase
      .from("case_custom_questions")
      .select(
        "section_key, question_key, label, help_text, question_type, choices, required, conditional_logic",
      )
      .eq("case_id", caseId)
      .order("sort_order")
      .returns<CustomRow[]>(),
    supabase
      .from("case_requested_evidence")
      .select("evidence_category, label, help_text, required")
      .eq("case_id", caseId)
      .order("sort_order")
      .returns<RequestedRow[]>(),
  ]);

  const item = caseResult.data;
  if (!item) return null;
  if (
    caseResult.error ||
    moduleResult.error ||
    selectedResult.error ||
    adminResult.error ||
    factResult.error ||
    candidateResult.error ||
    customResult.error ||
    requestedResult.error
  ) {
    throw new Error("사건 설정을 안전하게 불러오지 못했습니다.");
  }

  const availableModuleIds = new Set(
    (moduleResult.data ?? []).map((module) => module.id),
  );
  const modules: ModuleOption[] = (moduleResult.data ?? []).map((module) => ({
    id: module.id,
    moduleKey: module.module_key,
    moduleType: module.module_type,
    title: module.title,
    description: module.description,
  }));
  const admins = (adminResult.data ?? []).map((profile) => ({
    id: profile.user_id,
    label: profile.display_name ?? profile.email,
  }));
  if (!admins.some((profile) => profile.id === admin.id)) {
    admins.push({ id: admin.id, label: admin.displayName ?? admin.email });
  }

  return {
    case: {
      id: item.id,
      case_code: item.case_code,
      business_name: item.business_name,
      intake_status: item.intake_status,
    },
    modules,
    admins,
    initialValues: {
      businessName: item.business_name,
      industryKey: item.industry_key,
      customerName: item.customer_name ?? "",
      customerPhone: item.customer_phone ?? "",
      customerContactChannel: item.customer_contact_channel ?? "",
      customerIntro: item.customer_intro,
      expectedCompletionMinutes: item.expected_completion_minutes,
      moduleIds: (selectedResult.data ?? [])
        .map((selected) => selected.module_id)
        .filter((moduleId) => availableModuleIds.has(moduleId)),
      knownFacts: (factResult.data ?? []).map((fact) => ({
        fieldKey: fact.field_key,
        value: formatPrefillValue(fact.field_value),
        sourceType: fact.source_type,
        sourceNote: fact.source_note ?? "",
        customerCanEdit: fact.customer_can_edit,
      })),
      profileCandidates: (candidateResult.data ?? []).map((profile) => ({
        existingId: profile.id,
        mapsUrl: profile.maps_url ?? "",
        displayedName: profile.displayed_name ?? "",
        displayedAddress: profile.displayed_address ?? "",
        displayedFloor: profile.displayed_floor ?? "",
        mapPinNotes: profile.map_pin_notes ?? "",
        displayedPhone: profile.displayed_phone ?? "",
        displayedWebsite: profile.displayed_website ?? "",
        displayedCategory: profile.displayed_category ?? "",
        rating: optionalNumber(profile.rating),
        reviewCount: optionalNumber(profile.review_count),
        possibleCreator: profile.possible_creator ?? "",
        customerControlsProfile: profile.customer_controls_profile ?? "",
        ownershipRequestStatus: profile.ownership_request_status ?? "",
        relationNotes: profile.relation_notes ?? "",
        independentBusinessSignals: asObject(
          profile.independent_business_signals,
        ),
      })),
      customQuestions: (customResult.data ?? [])
        .filter(
          (
            question,
          ): question is CustomRow & {
            section_key: ValidatedCreateCaseInput["customQuestions"][number]["sectionKey"];
          } => question.section_key !== "goals",
        )
        .map((question) => ({
          sectionKey: question.section_key,
          questionKey: question.question_key,
          label: question.label,
          helpText: question.help_text ?? "",
          questionType: question.question_type,
          choices: Array.isArray(question.choices)
            ? question.choices.filter(
                (choice): choice is string => typeof choice === "string",
              )
            : [],
          required: question.required,
          conditionalLogic: asObject(question.conditional_logic),
        })),
      requestedEvidence: (requestedResult.data ?? []).map((requested) => ({
        evidenceCategory: requested.evidence_category,
        label: requested.label,
        helpText: requested.help_text ?? "",
        required: requested.required,
      })),
      assignedAdminId: item.assigned_admin_id ?? admin.id,
      website: "",
    },
  };
}

function optionalNumber(value: number | string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function formatPrefillValue(value: unknown): string {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return JSON.stringify(value ?? "");
}
