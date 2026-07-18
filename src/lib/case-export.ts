import type { CaseWorkspace } from "@/lib/case-workspace";

export type CaseExportType =
  | "json"
  | "case"
  | "history"
  | "profiles"
  | "evidence";

export function buildCaseJsonExport(workspace: CaseWorkspace) {
  return {
    exportedAt: new Date().toISOString(),
    case: withoutKeys(workspace.case, ["id"]),
    modules: workspace.moduleTitles,
    currentBusiness: workspace.currentBusiness,
    historySummary: workspace.historySummary,
    historyEvents: workspace.historyEvents.map((event) =>
      withoutKeys(event, ["id"]),
    ),
    currentProfileCandidates: workspace.profiles.map((profile) =>
      withoutKeys(profile, ["id"]),
    ),
    thirdParties: workspace.thirdParties.map((party) =>
      withoutKeys(party, ["id"]),
    ),
    evidence: workspace.evidence.map((item) =>
      withoutKeys(item, [
        "id",
        "history_event_id",
        "current_profile_candidate_id",
      ]),
    ),
    diagnosis: workspace.diagnosis,
    facts: workspace.facts.map((fact) =>
      withoutKeys(fact, ["id", "source_id"]),
    ),
    followUps: workspace.followUps.map((followUp) =>
      withoutKeys(followUp, ["id"]),
    ),
    adminNotes: workspace.notes.map((note) =>
      withoutKeys(note, ["id", "author_id"]),
    ),
    activity: workspace.activity.map((item) =>
      withoutKeys(item, ["id", "actor_id"]),
    ),
  };
}

export function buildCaseCsvExport(
  workspace: CaseWorkspace,
  type: Exclude<CaseExportType, "json">,
) {
  switch (type) {
    case "history":
      return recordsToCsv(
        workspace.historyEvents.map((event, index) => ({
          order: index + 1,
          approximate_period: event.approximate_period,
          handled_by: event.handled_by,
          handler_type: event.handler_type,
          account_label: event.account_label,
          profile_name: event.profile_name,
          address: event.address,
          floor: event.floor,
          map_pin_notes: event.map_pin_notes,
          phone: event.phone,
          website: event.website,
          primary_category: event.primary_category,
          additional_categories: event.additional_categories,
          verification_method: event.verification_method,
          approval_status: event.approval_status,
          final_result: event.final_result,
          google_message: event.google_message,
          changes_before_result: event.changes_before_result,
          appeal_pending_when_recreated: event.appeal_pending_when_recreated,
          admin_normalization_note: event.admin_normalization_note,
        })),
      );
    case "profiles":
      return recordsToCsv([
        {
          type: "official_current_business",
          order: 0,
          name:
            workspace.currentBusiness?.desired_standard_name ??
            workspace.currentBusiness?.sign_name,
          address: workspace.currentBusiness?.official_address,
          floor: workspace.currentBusiness?.floor_structure,
          phone: workspace.currentBusiness?.official_phone,
          website: workspace.currentBusiness?.official_website,
          category: workspace.currentBusiness?.primary_activity,
          creator: null,
          control: workspace.currentBusiness?.authority_status,
          relation_notes: null,
        },
        ...workspace.profiles.map((profile, index) => ({
          type: "current_profile_candidate",
          order: index + 1,
          name: profile.displayed_name,
          address: profile.displayed_address,
          floor: profile.displayed_floor,
          phone: profile.displayed_phone,
          website: profile.displayed_website,
          category: profile.displayed_category,
          creator: profile.possible_creator,
          control: profile.customer_controls_profile,
          relation_notes: profile.relation_notes,
        })),
      ]);
    case "evidence":
      return recordsToCsv(
        workspace.evidence.map((item) => ({
          evidence_category: item.evidence_category,
          original_filename: item.original_filename,
          mime_type: item.mime_type,
          size_bytes: item.size_bytes,
          customer_description: item.customer_description,
          uploaded_by_type: item.uploaded_by_type,
          created_at: item.created_at,
        })),
      );
    case "case":
      return recordsToCsv([
        {
          case_code: workspace.case.case_code,
          business_name: workspace.case.business_name,
          industry: workspace.case.industry_key,
          customer_name: workspace.case.customer_name,
          contact_channel: workspace.case.customer_contact_channel,
          status: workspace.case.status,
          intake_status: workspace.case.intake_status,
          submitted_at: workspace.case.submitted_at,
          updated_at: workspace.case.updated_at,
          modules: workspace.moduleTitles,
          sign_name: workspace.currentBusiness?.sign_name,
          registration_name: workspace.currentBusiness?.registration_name,
          permit_name: workspace.currentBusiness?.permit_name,
          address: workspace.currentBusiness?.official_address,
          floor: workspace.currentBusiness?.floor_structure,
          official_phone: workspace.currentBusiness?.official_phone,
          official_website: workspace.currentBusiness?.official_website,
          creation_attempt_count:
            workspace.historySummary?.creation_attempt_count,
          suspension_count: workspace.historySummary?.suspension_count,
          account_count: workspace.historySummary?.account_count,
          appeal_status: workspace.historySummary?.appeal_status,
          current_profile_count: workspace.profiles.length,
          evidence_count: workspace.evidence.length,
          decision_path: workspace.diagnosis?.admin_decision_path,
          admin_conclusion: workspace.diagnosis?.admin_conclusion,
        },
      ]);
  }
}

export function recordsToCsv(records: Array<Record<string, unknown>>) {
  if (records.length === 0) return "\uFEFF";
  const headers = [
    ...new Set(records.flatMap((record) => Object.keys(record))),
  ];
  const rows = [
    headers,
    ...records.map((record) =>
      headers.map((header) => formatValue(record[header])),
    ),
  ];
  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}`;
}

function withoutKeys<T extends object, K extends keyof T>(
  value: T,
  keys: K[],
): Omit<T, K> {
  const copy = { ...value };
  for (const key of keys) delete copy[key];
  return copy;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return String(value);
  return JSON.stringify(value);
}

function escapeCsvCell(value: unknown) {
  const text = formatValue(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
