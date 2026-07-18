import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (...segments: string[]) =>
  readFileSync(join(root, ...segments), "utf8");
const migration = read(
  "supabase",
  "migrations",
  "202607190015_safe_case_configuration_workflow.sql",
);
const updateFunction = migration.slice(
  migration.indexOf(
    "create or replace function public.update_case_configuration",
  ),
  migration.indexOf(
    "create or replace function public.clone_case_with_configuration",
  ),
);
const cloneFunction = migration.slice(
  migration.indexOf(
    "create or replace function public.clone_case_with_configuration",
  ),
);

describe("safe pre-submission case configuration workflow", () => {
  it("keeps edit and clone transactional and service-role only", () => {
    expect(migration).toMatch(/^begin;/);
    expect(migration.trimEnd()).toMatch(/commit;$/);
    expect(updateFunction).toContain("for update;");
    expect(cloneFunction).toContain("for update;");
    expect(updateFunction).toContain("intake_status <> 'link_ready'");
    expect(cloneFunction).toContain("intake_status <> 'link_ready'");
    expect(updateFunction).toContain("configuration_not_editable");
    expect(cloneFunction).toContain("configuration_not_cloneable");
    expect(migration).toContain(
      "grant execute on function public.update_case_configuration(uuid, jsonb, uuid)\nto service_role",
    );
    expect(migration).toContain(
      "grant execute on function public.clone_case_with_configuration(uuid, jsonb, uuid)\nto service_role",
    );
    expect(migration).not.toMatch(
      /row level security|\bstorage\.|\bauth\.|grant\s+all|to\s+anon\s*;/i,
    );
  });

  it("updates setup fields without changing the existing case identity or token", () => {
    expect(updateFunction).toContain("where id = p_case_id");
    expect(updateFunction).not.toMatch(/set[\s\S]*?token_hash\s*=/i);
    expect(updateFunction).not.toMatch(/set[\s\S]*?case_code\s*=/i);
    expect(updateFunction).toContain("map_pin_notes");
    expect(updateFunction).toContain("displayed_website");
    expect(updateFunction).toContain("rating");
    expect(updateFunction).toContain("review_count");
    expect(updateFunction).toContain("'case_setup_updated'");
  });

  it("creates a separate configured case without copying customer or operational data", () => {
    expect(cloneFunction).toContain("public.create_case_with_configuration(");
    expect(cloneFunction).toContain("'case_cloned'");
    expect(cloneFunction).toContain("'source_case_id', p_source_case_id");
    expect(cloneFunction).toContain("candidate.item - 'existingId'");
    for (const forbiddenInsert of [
      "case_intake_responses",
      "case_evidence",
      "case_diagnosis",
      "case_fact_items",
      "admin_notes",
      "outbound_delivery_log",
      "history_events",
      "third_party_history",
      "customer_goals",
    ]) {
      expect(cloneFunction).not.toContain(
        `insert into public.${forbiddenInsert}`,
      );
    }
    expect(cloneFunction).not.toContain("draft_payload");
    expect(cloneFunction).not.toContain("final_payload");
    expect(cloneFunction).not.toContain("submitted_at");
    expect(cloneFunction).not.toContain("completed_at");
  });

  it("never records a token, token hash, customer response, or file path in activity metadata", () => {
    const activityStatements = [
      ...migration.matchAll(
        /insert into public\.case_activity_log[\s\S]*?\);/g,
      ),
    ].map((match) => match[0]);
    expect(activityStatements).toHaveLength(2);
    for (const statement of activityStatements) {
      expect(statement).not.toMatch(
        /token|draft_payload|final_payload|storage_path|customer_raw_response/i,
      );
    }
  });

  it("loads only administrator profile candidates in stable setup order", () => {
    const loader = read("src", "lib", "case-setup.ts");
    expect(loader).toContain('.is("customer_client_id", null)');
    expect(
      loader.match(/\.order\("sort_order"\)/g)?.length,
    ).toBeGreaterThanOrEqual(3);
    expect(loader).not.toContain("draft_payload");
    expect(loader).not.toContain("final_payload");
    expect(loader).not.toContain("case_evidence");
    expect(loader).not.toContain("case_diagnosis");
  });

  it("keeps the same public token lookup while serving live configuration rows", () => {
    const publicIntake = read("src", "lib", "public-intake.ts");
    expect(publicIntake).toContain('.eq("token_hash", tokenHash)');
    expect(publicIntake).toContain('.from("case_modules")');
    expect(publicIntake).toContain('.from("case_prefilled_fields")');
    expect(publicIntake).toContain('.from("current_profile_candidates")');
    expect(publicIntake).toContain('.from("case_custom_questions")');
    expect(publicIntake).toContain('.from("case_requested_evidence")');
  });

  it("exposes edit and clone only with the documented Korean status guidance", () => {
    const detailPage = read("src", "app", "admin", "cases", "[id]", "page.tsx");
    const editPage = read(
      "src",
      "app",
      "admin",
      "cases",
      "[id]",
      "edit",
      "page.tsx",
    );
    const clonePage = read(
      "src",
      "app",
      "admin",
      "cases",
      "[id]",
      "clone",
      "page.tsx",
    );

    expect(detailPage).toContain("사건 설정 수정");
    expect(detailPage).toContain("설정 복제 후 새 링크 만들기");
    expect(detailPage).toContain(
      "canChangeCaseSetup(workspace.case.intake_status)",
    );
    expect(editPage).toContain("기존 사건 설정 수정");
    expect(clonePage).toContain("기존 설정으로 새 사건 만들기");
    expect(clonePage).toContain(
      "고객 답변, 제출 자료, 진단 결과와 기존 보안 링크는 복사하지",
    );
    expect(clonePage).toContain("caseSetupUnavailableMessage");
    expect(clonePage).toContain("caseSetupCreateNewMessage");
  });
});
