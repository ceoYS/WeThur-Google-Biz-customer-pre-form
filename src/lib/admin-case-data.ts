import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type DashboardCaseRow = {
  id: string;
  case_code: string;
  business_name: string;
  industry_key: string;
  customer_name: string | null;
  submitted_at: string | null;
  status: string;
  intake_status: string;
  assigned_admin_id: string | null;
  updated_at: string;
};

type ModuleLinkRow = {
  case_id: string;
  question_modules:
    | { title: string; module_type: string }
    | Array<{ title: string; module_type: string }>
    | null;
};

type DiagnosisRow = {
  case_id: string;
  hypotheses: unknown;
  missing_information: unknown;
};
type HistoryRow = { case_id: string; appeal_status: string | null };
type AdminRow = { user_id: string; display_name: string | null; email: string };

export type DashboardCase = {
  id: string;
  caseCode: string;
  businessName: string;
  industry: string;
  customerName: string;
  submittedAt: string | null;
  status: string;
  intakeStatus: string;
  issueModules: string[];
  topHypothesis: string;
  missingInformationCount: number;
  attachmentCount: number;
  appealStatus: string;
  assignedAdmin: string;
  updatedAt: string;
};

function firstHypothesisTitle(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return "아직 생성 전";
  const first: unknown = value[0];
  if (!first || typeof first !== "object" || !("title" in first))
    return "확인 필요";
  return typeof first.title === "string" ? first.title : "확인 필요";
}

export async function getDashboardCases(): Promise<DashboardCase[]> {
  const supabase = await createServerSupabaseClient();
  const { data: caseRows, error } = await supabase
    .from("cases")
    .select(
      "id, case_code, business_name, industry_key, customer_name, submitted_at, status, intake_status, assigned_admin_id, updated_at",
    )
    .order("updated_at", { ascending: false })
    .returns<DashboardCaseRow[]>();

  if (error || !caseRows?.length) return [];
  const caseIds = caseRows.map((row) => row.id);
  const [
    moduleResult,
    diagnosisResult,
    evidenceResult,
    historyResult,
    adminResult,
  ] = await Promise.all([
    supabase
      .from("case_modules")
      .select("case_id, question_modules(title, module_type)")
      .in("case_id", caseIds)
      .returns<ModuleLinkRow[]>(),
    supabase
      .from("case_diagnosis")
      .select("case_id, hypotheses, missing_information")
      .in("case_id", caseIds)
      .returns<DiagnosisRow[]>(),
    supabase.from("case_evidence").select("case_id").in("case_id", caseIds),
    supabase
      .from("case_history_summary")
      .select("case_id, appeal_status")
      .in("case_id", caseIds)
      .returns<HistoryRow[]>(),
    supabase
      .from("admin_profiles")
      .select("user_id, display_name, email")
      .returns<AdminRow[]>(),
  ]);

  const moduleMap = new Map<
    string,
    Array<{ title: string; moduleType: string }>
  >();
  for (const link of moduleResult.data ?? []) {
    const related = Array.isArray(link.question_modules)
      ? link.question_modules[0]
      : link.question_modules;
    if (!related) continue;
    const list = moduleMap.get(link.case_id) ?? [];
    list.push({ title: related.title, moduleType: related.module_type });
    moduleMap.set(link.case_id, list);
  }

  const diagnosisMap = new Map(
    (diagnosisResult.data ?? []).map((row) => [row.case_id, row]),
  );
  const historyMap = new Map(
    (historyResult.data ?? []).map((row) => [row.case_id, row.appeal_status]),
  );
  const adminMap = new Map(
    (adminResult.data ?? []).map((row) => [
      row.user_id,
      row.display_name ?? row.email,
    ]),
  );
  const evidenceCounts = new Map<string, number>();
  for (const row of evidenceResult.data ?? []) {
    const caseId = typeof row.case_id === "string" ? row.case_id : "";
    evidenceCounts.set(caseId, (evidenceCounts.get(caseId) ?? 0) + 1);
  }

  return caseRows.map((row) => {
    const selectedModules = moduleMap.get(row.id) ?? [];
    const diagnosis = diagnosisMap.get(row.id);
    return {
      id: row.id,
      caseCode: row.case_code,
      businessName: row.business_name,
      industry:
        selectedModules.find((module) => module.moduleType === "industry")
          ?.title ?? row.industry_key,
      customerName: row.customer_name ?? "미입력",
      submittedAt: row.submitted_at,
      status: row.status,
      intakeStatus: row.intake_status,
      issueModules: selectedModules
        .filter((module) => module.moduleType === "issue")
        .map((module) => module.title),
      topHypothesis: firstHypothesisTitle(diagnosis?.hypotheses),
      missingInformationCount: Array.isArray(diagnosis?.missing_information)
        ? diagnosis.missing_information.length
        : 0,
      attachmentCount: evidenceCounts.get(row.id) ?? 0,
      appealStatus: historyMap.get(row.id) ?? "미확인",
      assignedAdmin: row.assigned_admin_id
        ? (adminMap.get(row.assigned_admin_id) ?? "미지정")
        : "미지정",
      updatedAt: row.updated_at,
    };
  });
}
