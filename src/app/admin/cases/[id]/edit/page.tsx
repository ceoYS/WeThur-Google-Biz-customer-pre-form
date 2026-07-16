import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { CaseConfigurationEditor } from "@/components/admin/case-configuration-editor";
import type { ModuleOption } from "@/components/admin/case-creation-form";
import { requireAdmin } from "@/lib/admin-auth";
import type {
  CreateCaseInput,
  ValidatedCreateCaseInput,
} from "@/lib/schemas/case";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CaseRow = {
  id: string;
  business_name: string;
  industry_key: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_contact_channel: string | null;
  customer_intro: string;
  expected_completion_minutes: number;
  assigned_admin_id: string | null;
  intake_status: string;
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
  displayed_phone: string | null;
  displayed_website: string | null;
  displayed_category: string | null;
  relation_notes: string | null;
};
type CustomRow = {
  section_key: ValidatedCreateCaseInput["customQuestions"][number]["sectionKey"];
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

export default async function EditCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const idResult = z.uuid().safeParse((await params).id);
  if (!idResult.success) notFound();
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
        "id, business_name, industry_key, customer_name, customer_phone, customer_contact_channel, customer_intro, expected_completion_minutes, assigned_admin_id, intake_status",
      )
      .eq("id", idResult.data)
      .maybeSingle<CaseRow>(),
    supabase
      .from("question_modules")
      .select("id, module_key, module_type, title, description")
      .eq("is_active", true)
      .order("module_type")
      .returns<ModuleRow[]>(),
    supabase
      .from("case_modules")
      .select("module_id")
      .eq("case_id", idResult.data)
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
      .eq("case_id", idResult.data)
      .returns<FactRow[]>(),
    supabase
      .from("current_profile_candidates")
      .select(
        "id, maps_url, displayed_name, displayed_address, displayed_floor, displayed_phone, displayed_website, displayed_category, relation_notes",
      )
      .eq("case_id", idResult.data)
      .is("customer_client_id", null)
      .order("sort_order")
      .returns<CandidateRow[]>(),
    supabase
      .from("case_custom_questions")
      .select(
        "section_key, question_key, label, help_text, question_type, choices, required, conditional_logic",
      )
      .eq("case_id", idResult.data)
      .order("sort_order")
      .returns<CustomRow[]>(),
    supabase
      .from("case_requested_evidence")
      .select("evidence_category, label, help_text, required")
      .eq("case_id", idResult.data)
      .order("sort_order")
      .returns<RequestedRow[]>(),
  ]);
  const item = caseResult.data;
  if (!item) notFound();
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
  if (!admins.some((profile) => profile.id === admin.id))
    admins.push({ id: admin.id, label: admin.displayName ?? admin.email });
  const initialValues: CreateCaseInput = {
    businessName: item.business_name,
    industryKey: item.industry_key,
    customerName: item.customer_name ?? "",
    customerPhone: item.customer_phone ?? "",
    customerContactChannel: item.customer_contact_channel ?? "",
    customerIntro: item.customer_intro,
    expectedCompletionMinutes: item.expected_completion_minutes,
    moduleIds: (selectedResult.data ?? []).map(
      (selected) => selected.module_id,
    ),
    knownFacts: (factResult.data ?? []).map((fact) => ({
      fieldKey: fact.field_key,
      value: formatValue(fact.field_value),
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
      displayedPhone: profile.displayed_phone ?? "",
      displayedWebsite: profile.displayed_website ?? "",
      displayedCategory: profile.displayed_category ?? "",
      relationNotes: profile.relation_notes ?? "",
    })),
    customQuestions: (customResult.data ?? []).map((question) => ({
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
      conditionalLogic:
        question.conditional_logic &&
        typeof question.conditional_logic === "object" &&
        !Array.isArray(question.conditional_logic)
          ? (question.conditional_logic as Record<string, unknown>)
          : {},
    })),
    requestedEvidence: (requestedResult.data ?? []).map((requested) => ({
      evidenceCategory: requested.evidence_category,
      label: requested.label,
      helpText: requested.help_text ?? "",
      required: requested.required,
    })),
    assignedAdminId: item.assigned_admin_id ?? admin.id,
    website: "",
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-12">
      <header className="mb-12 border-b border-[var(--navy-300)] pb-7">
        <Link
          href={`/admin/cases/${item.id}`}
          className="text-sm font-bold text-[var(--navy-700)]"
        >
          ← 사건 작업공간
        </Link>
        <h1 className="mt-9 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
          사건 설정 편집
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--navy-700)]">
          고객이 최종 제출하기 전까지만 질문 구성과 사전 정보를 변경할 수
          있습니다.
        </p>
      </header>
      {item.intake_status === "submitted" ||
      item.intake_status === "reopened" ? (
        <div className="border-l-4 border-[var(--navy-950)] pl-6">
          <h2 className="text-xl font-black">
            원본 응답 보호를 위해 설정이 잠겼습니다.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--navy-700)]">
            제출된 답변을 보존한 상태에서는 질문과 사전 프로필 구성을 다시 쓰지
            않습니다.
          </p>
        </div>
      ) : (
        <CaseConfigurationEditor
          caseId={item.id}
          modules={modules}
          admins={admins}
          initialValues={initialValues}
        />
      )}
    </main>
  );
}

function formatValue(value: unknown): string {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return String(value);
  return JSON.stringify(value ?? "");
}
