import "server-only";

import { diagnoseCase, type DiagnosisResult } from "@/lib/diagnosis-engine";
import type { ValidatedIntakePayload } from "@/lib/schemas/intake";
import { generateMissingInformation } from "@/lib/missing-information-engine";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function generateAndStoreDiagnosis(
  caseId: string,
  payload: ValidatedIntakePayload,
): Promise<DiagnosisResult> {
  const service = createServiceRoleClient();
  const { data: evidence, error: evidenceError } = await service
    .from("case_evidence")
    .select("evidence_category")
    .eq("case_id", caseId)
    .returns<Array<{ evidence_category: string }>>();

  if (evidenceError) throw new Error("diagnosis_evidence_lookup_failed");

  const result = diagnoseCase({
    payload,
    evidenceCategories: (evidence ?? []).map((item) => item.evidence_category),
  });
  const missing = generateMissingInformation({
    payload,
    diagnosis: result,
    evidenceCategories: (evidence ?? []).map((item) => item.evidence_category),
  });
  const { scores } = result;
  const { error } = await service.from("case_diagnosis").upsert({
    case_id: caseId,
    engine_version: result.engineVersion,
    duplicate_entity_score: scores.duplicateEntity,
    name_consistency_score: scores.nameConsistency,
    address_floor_pin_score: scores.addressFloorPin,
    phone_website_score: scores.phoneWebsite,
    category_consistency_score: scores.categoryConsistency,
    ownership_control_score: scores.ownershipControl,
    account_appeal_score: scores.accountAppeal,
    physical_evidence_score: scores.physicalEvidence,
    repeated_recreation_score: scores.repeatedRecreation,
    independent_business_ambiguity_score: scores.independentBusinessAmbiguity,
    hypotheses: result.hypotheses,
    missing_information: missing.items,
    suggested_questions: missing.suggestedQuestions,
    suggested_paths: result.suggestedPaths,
    generated_at: new Date().toISOString(),
  });

  if (error) throw new Error("diagnosis_persist_failed");
  return result;
}

export async function recordDiagnosisFailure(caseId: string) {
  const service = createServiceRoleClient();
  await service.from("case_activity_log").insert({
    case_id: caseId,
    actor_type: "system",
    action: "diagnosis_generation_failed",
    metadata: {},
  });
}
