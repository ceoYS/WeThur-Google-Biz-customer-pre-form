import "server-only";

import { moduleSchemaJsonSchema } from "@/lib/question-modules";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type WorkspaceCase = {
  id: string;
  case_code: string;
  business_name: string;
  industry_key: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_contact_channel: string | null;
  customer_intro: string;
  expected_completion_minutes: number;
  token_status: string;
  status: string;
  intake_status: string;
  assigned_admin_id: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  completed_at: string | null;
  retention_review_at: string | null;
};

export type CurrentBusiness = {
  customer_preferred_title: string | null;
  preferred_contact_method: string | null;
  relationship_to_business: string | null;
  authority_status: string | null;
  sign_name: string | null;
  entrance_sign_name: string | null;
  registration_name: string | null;
  permit_name: string | null;
  official_address: string | null;
  building_name: string | null;
  floor_structure: string | null;
  independent_business_count: number | null;
  entrance_structure: string | null;
  floor_independence_signals: unknown;
  official_phone: string | null;
  official_website: string | null;
  primary_activity: string | null;
  opening_hours: string | null;
  desired_standard_name: string | null;
  keyword_name_history: string | null;
  raw_notes: string | null;
};

export type HistorySummary = {
  first_registration_period: string | null;
  creation_attempt_count: number | null;
  suspension_count: number | null;
  account_count: number | null;
  third_party_count: number | null;
  old_account_access_status: string | null;
  appeal_status: string | null;
  recreated_during_appeal: string | null;
  overall_history: string | null;
};

export type HistoryEvent = {
  id: string;
  sort_order: number;
  approximate_period: string | null;
  handled_by: string | null;
  handler_type: string | null;
  account_label: string | null;
  profile_name: string | null;
  address: string | null;
  floor: string | null;
  map_pin_notes: string | null;
  phone: string | null;
  website: string | null;
  primary_category: string | null;
  additional_categories: unknown;
  verification_method: string | null;
  approval_status: string | null;
  final_result: string | null;
  google_message: string | null;
  changes_before_result: string | null;
  appeal_pending_when_recreated: string | null;
  same_account_other_suspensions: string | null;
  ownership_change_notes: string | null;
  evidence_notes: string | null;
  admin_normalization_note: string | null;
  customer_raw_response: unknown;
};

export type ProfileCandidate = {
  id: string;
  sort_order: number;
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
  possible_creator: string | null;
  customer_controls_profile: string | null;
  ownership_request_status: string | null;
  relation_notes: string | null;
  independent_business_signals: unknown;
};

export type ThirdParty = {
  id: string;
  party_name: string | null;
  party_type: string | null;
  approximate_period: string | null;
  work_requested: string | null;
  account_access_level: string | null;
  changes_made: unknown;
  notes: string | null;
};

export type EvidenceItem = {
  id: string;
  evidence_category: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  customer_description: string | null;
  uploaded_by_type: string;
  history_event_id: string | null;
  current_profile_candidate_id: string | null;
  created_at: string;
};

export type DiagnosisRow = {
  engine_version: string;
  duplicate_entity_score: number;
  name_consistency_score: number;
  address_floor_pin_score: number;
  phone_website_score: number;
  category_consistency_score: number;
  ownership_control_score: number;
  account_appeal_score: number;
  physical_evidence_score: number;
  repeated_recreation_score: number;
  independent_business_ambiguity_score: number;
  hypotheses: unknown;
  missing_information: unknown;
  suggested_questions: unknown;
  suggested_paths: unknown;
  generated_at: string;
  admin_conclusion: string | null;
  admin_decision_path: string | null;
};

export type FactItem = {
  id: string;
  source_type: string;
  source_id: string | null;
  fact_key: string;
  fact_value: unknown;
  verification_status: string;
  admin_note: string | null;
};

export type FollowUp = {
  id: string;
  title: string;
  message: string;
  requested_items: unknown;
  status: string;
  customer_response: string | null;
  created_at: string;
  responded_at: string | null;
};

export type AdminNote = {
  id: string;
  author_id: string | null;
  note_type: string;
  content: string;
  created_at: string;
};

export type ActivityItem = {
  id: string;
  actor_type: string;
  actor_id: string | null;
  action: string;
  metadata: unknown;
  created_at: string;
};

export type CaseWorkspace = {
  case: WorkspaceCase;
  moduleTitles: string[];
  currentBusiness: CurrentBusiness | null;
  historySummary: HistorySummary | null;
  historyEvents: HistoryEvent[];
  profiles: ProfileCandidate[];
  thirdParties: ThirdParty[];
  evidence: EvidenceItem[];
  diagnosis: DiagnosisRow | null;
  facts: FactItem[];
  followUps: FollowUp[];
  notes: AdminNote[];
  activity: ActivityItem[];
  customerAnswers: Record<string, unknown>;
  questionMetadata: Record<
    string,
    { label: string; sectionKey: string }
  >;
  finalIntakePayload: unknown;
};

type ModuleLink = {
  question_modules:
    | { title: string; schema_json: unknown }
    | Array<{ title: string; schema_json: unknown }>
    | null;
};

type CustomQuestionMetadata = {
  question_key: string;
  label: string;
  section_key: string;
};

type IntakeResponseRow = { final_payload: unknown };

export async function getCaseWorkspace(
  caseId: string,
): Promise<CaseWorkspace | null> {
  const supabase = await createServerSupabaseClient();
  const [
    caseResult,
    moduleResult,
    customQuestionResult,
    intakeResponseResult,
    currentResult,
    historyResult,
    eventResult,
    profileResult,
    thirdPartyResult,
    evidenceResult,
    diagnosisResult,
    factResult,
    followUpResult,
    noteResult,
    activityResult,
  ] = await Promise.all([
    supabase
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .maybeSingle<WorkspaceCase>(),
    supabase
      .from("case_modules")
      .select("question_modules(title, schema_json)")
      .eq("case_id", caseId)
      .order("sort_order")
      .returns<ModuleLink[]>(),
    supabase
      .from("case_custom_questions")
      .select("question_key, label, section_key")
      .eq("case_id", caseId)
      .order("sort_order")
      .returns<CustomQuestionMetadata[]>(),
    supabase
      .from("case_intake_responses")
      .select("final_payload")
      .eq("case_id", caseId)
      .maybeSingle<IntakeResponseRow>(),
    supabase
      .from("case_current_business")
      .select(
        "customer_preferred_title, preferred_contact_method, relationship_to_business, authority_status, sign_name, entrance_sign_name, registration_name, permit_name, official_address, building_name, floor_structure, independent_business_count, entrance_structure, floor_independence_signals, official_phone, official_website, primary_activity, opening_hours, desired_standard_name, keyword_name_history, raw_notes",
      )
      .eq("case_id", caseId)
      .maybeSingle<CurrentBusiness>(),
    supabase
      .from("case_history_summary")
      .select("*")
      .eq("case_id", caseId)
      .maybeSingle<HistorySummary>(),
    supabase
      .from("history_events")
      .select(
        "id, sort_order, approximate_period, handled_by, handler_type, account_label, profile_name, address, floor, map_pin_notes, phone, website, primary_category, additional_categories, verification_method, approval_status, final_result, google_message, changes_before_result, appeal_pending_when_recreated, same_account_other_suspensions, ownership_change_notes, evidence_notes, admin_normalization_note, customer_raw_response",
      )
      .eq("case_id", caseId)
      .order("sort_order")
      .returns<HistoryEvent[]>(),
    supabase
      .from("current_profile_candidates")
      .select(
        "id, sort_order, maps_url, displayed_name, displayed_address, displayed_floor, map_pin_notes, displayed_phone, displayed_website, displayed_category, rating, review_count, possible_creator, customer_controls_profile, ownership_request_status, relation_notes, independent_business_signals",
      )
      .eq("case_id", caseId)
      .order("sort_order")
      .returns<ProfileCandidate[]>(),
    supabase
      .from("third_party_history")
      .select(
        "id, party_name, party_type, approximate_period, work_requested, account_access_level, changes_made, notes",
      )
      .eq("case_id", caseId)
      .order("created_at")
      .returns<ThirdParty[]>(),
    supabase
      .from("case_evidence")
      .select(
        "id, evidence_category, original_filename, mime_type, size_bytes, customer_description, uploaded_by_type, history_event_id, current_profile_candidate_id, created_at",
      )
      .eq("case_id", caseId)
      .order("created_at")
      .returns<EvidenceItem[]>(),
    supabase
      .from("case_diagnosis")
      .select(
        "engine_version, duplicate_entity_score, name_consistency_score, address_floor_pin_score, phone_website_score, category_consistency_score, ownership_control_score, account_appeal_score, physical_evidence_score, repeated_recreation_score, independent_business_ambiguity_score, hypotheses, missing_information, suggested_questions, suggested_paths, generated_at, admin_conclusion, admin_decision_path",
      )
      .eq("case_id", caseId)
      .maybeSingle<DiagnosisRow>(),
    supabase
      .from("case_fact_items")
      .select(
        "id, source_type, source_id, fact_key, fact_value, verification_status, admin_note",
      )
      .eq("case_id", caseId)
      .order("fact_key")
      .returns<FactItem[]>(),
    supabase
      .from("follow_up_requests")
      .select(
        "id, title, message, requested_items, status, customer_response, created_at, responded_at",
      )
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .returns<FollowUp[]>(),
    supabase
      .from("admin_notes")
      .select("id, author_id, note_type, content, created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .returns<AdminNote[]>(),
    supabase
      .from("case_activity_log")
      .select("id, actor_type, actor_id, action, metadata, created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<ActivityItem[]>(),
  ]);

  if (caseResult.error || !caseResult.data) return null;
  const linkedModules = (moduleResult.data ?? []).flatMap((link) => {
    if (Array.isArray(link.question_modules))
      return link.question_modules;
    return link.question_modules ? [link.question_modules] : [];
  });
  const moduleTitles = linkedModules.map(
    (questionModule) => questionModule.title,
  );
  const questionMetadata: CaseWorkspace["questionMetadata"] = {};
  for (const questionModule of linkedModules) {
    const schema = moduleSchemaJsonSchema.safeParse(
      questionModule.schema_json,
    );
    if (!schema.success) continue;
    for (const question of schema.data.questions) {
      questionMetadata[question.key] = {
        label: question.label,
        sectionKey: question.sectionKey,
      };
    }
  }
  for (const question of customQuestionResult.data ?? []) {
    questionMetadata[question.question_key] = {
      label: question.label,
      sectionKey: question.section_key,
    };
  }
  const finalIntakePayload = intakeResponseResult.data?.final_payload ?? null;
  const customerAnswers = isRecord(finalIntakePayload)
    ? recordValue(finalIntakePayload.answers)
    : {};

  return {
    case: caseResult.data,
    moduleTitles,
    currentBusiness: currentResult.data,
    historySummary: historyResult.data,
    historyEvents: eventResult.data ?? [],
    profiles: profileResult.data ?? [],
    thirdParties: thirdPartyResult.data ?? [],
    evidence: evidenceResult.data ?? [],
    diagnosis: diagnosisResult.data,
    facts: factResult.data ?? [],
    followUps: followUpResult.data ?? [],
    notes: noteResult.data ?? [],
    activity: activityResult.data ?? [],
    customerAnswers,
    questionMetadata,
    finalIntakePayload,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}
