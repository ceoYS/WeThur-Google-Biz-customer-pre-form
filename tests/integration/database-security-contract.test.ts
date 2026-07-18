import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { TextDecoder } from "node:util";

import { describe, expect, it } from "vitest";

import { moduleSchemaJsonSchema } from "@/lib/question-modules";

const migrationDirectory = join(process.cwd(), "supabase", "migrations");
const migrations = readdirSync(migrationDirectory)
  .toSorted()
  .map((name) => readFileSync(join(migrationDirectory, name), "utf8"))
  .join("\n");

describe("database and storage security contract", () => {
  it("enables RLS for every application table and revokes anonymous table access", () => {
    const core = readFileSync(
      join(migrationDirectory, "202607160001_core_schema.sql"),
      "utf8",
    );
    const tables = [...core.matchAll(/create table public\.([a-z_]+) \(/g)].map(
      (match) => match[1],
    );
    expect(tables.length).toBeGreaterThan(20);
    for (const table of tables) {
      expect(migrations).toContain(
        `alter table public.${table} enable row level security`,
      );
    }
    expect(migrations).toContain(
      "revoke all on all tables in schema public from anon",
    );
  });

  it("keeps customer RPCs service-only and duplicate submission locked", () => {
    expect(migrations).toContain("for update");
    expect(migrations).toContain("message = 'already_submitted'");
    expect(migrations).toContain(
      "revoke all on function public.submit_case_intake(text, jsonb) from public, anon, authenticated",
    );
    expect(migrations).toContain(
      "grant execute on function public.submit_case_intake(text, jsonb) to service_role",
    );
  });

  it("creates only a private evidence bucket and aligns third-party payload arrays", () => {
    expect(migrations).toMatch(/'case-evidence',\s*'case-evidence',\s*false/);
    expect(migrations).toContain("third_party_changes_array");
    expect(migrations).toContain(
      "check (jsonb_typeof(changes_made) = 'array')",
    );
    expect(migrations).not.toContain("to anon using");
  });

  it("grants the service role only the table privileges used by server code", () => {
    const serviceRoleMigration = readFileSync(
      join(
        migrationDirectory,
        "202607180012_service_role_least_privilege_grants.sql",
      ),
      "utf8",
    );
    const privilegeMatrix: Record<string, string[]> = {};

    for (const match of serviceRoleMigration.matchAll(
      /grant\s+([a-z,\s]+?)\s+on table\s+([\s\S]+?)\s+to service_role;/g,
    )) {
      const privileges = (match[1] ?? "")
        .split(",")
        .map((privilege) => privilege.trim())
        .filter(Boolean)
        .toSorted();
      const tables = [...(match[2] ?? "").matchAll(/public\.([a-z_]+)/g)].map(
        (tableMatch) => tableMatch[1] ?? "",
      );
      for (const table of tables) privilegeMatrix[table] = privileges;
    }

    expect(serviceRoleMigration).toContain(
      "grant usage on schema public to service_role",
    );
    expect(privilegeMatrix).toEqual({
      admin_profiles: ["insert", "select", "update"],
      case_activity_log: ["insert"],
      case_custom_questions: ["select"],
      case_diagnosis: ["insert", "select", "update"],
      case_evidence: ["delete", "select"],
      case_fact_items: ["select", "update"],
      case_intake_responses: ["select"],
      case_modules: ["select"],
      case_prefilled_fields: ["select"],
      case_requested_evidence: ["select"],
      cases: ["select", "update"],
      current_profile_candidates: ["select"],
      follow_up_requests: ["insert", "select", "update"],
      history_events: ["insert", "select", "update"],
      outbound_delivery_log: ["insert"],
      question_modules: ["select"],
      admin_notes: ["insert", "select"],
    });
    expect(serviceRoleMigration).not.toMatch(/grant\s+all\b/i);
    expect(serviceRoleMigration).not.toMatch(/on\s+all\s+tables/i);
    expect(serviceRoleMigration).not.toMatch(/alter\s+default\s+privileges/i);
  });
});

describe("seeded question-module catalog", () => {
  const catalog = readFileSync(
    join(migrationDirectory, "202607160004_question_module_catalog.sql"),
    "utf8",
  );

  it("keeps every seeded JSON definition compatible with the runtime schema", () => {
    const moduleKeys = [
      ...catalog.matchAll(
        /\(\s*'([a-z0-9_]+)',\s*'(?:common|industry|issue)'/g,
      ),
    ].map((match) => match[1]);
    const definitions = [
      ...catalog.matchAll(/\$json\$([\s\S]*?)\$json\$::jsonb/g),
    ].map((match) => {
      const definition = match[1];
      if (!definition) throw new Error("Seeded module JSON is empty.");
      return JSON.parse(definition) as unknown;
    });

    expect(moduleKeys.length).toBe(definitions.length);
    expect(moduleKeys.length).toBeGreaterThanOrEqual(30);
    for (const definition of definitions) {
      expect(() => moduleSchemaJsonSchema.parse(definition)).not.toThrow();
    }
  });

  it("contains the modules needed for the documented first-case setup", () => {
    for (const moduleKey of [
      "industry_nightlife_entertainment",
      "issue_prior_suspension",
      "issue_repeated_disappearance",
      "issue_duplicate_profiles",
      "issue_unknown_third_party_ownership",
      "issue_multiple_floors",
      "issue_multiple_agencies_managers",
      "issue_business_name_inconsistency",
      "issue_address_pin_inconsistency",
      "issue_phone_website_inconsistency",
      "issue_category_inconsistency",
      "issue_appeal_status_unknown",
    ]) {
      expect(catalog).toContain(`'${moduleKey}'`);
    }
  });

  it("removes the external contact choice with an idempotent targeted migration", () => {
    const migration = readFileSync(
      join(
        migrationDirectory,
        "202607180013_remove_external_contact_choice.sql",
      ),
      "utf8",
    );

    expect(migration).toMatch(/^begin;/);
    expect(migration.trimEnd()).toMatch(/commit;$/);
    expect(migration).toContain("update public.question_modules");
    expect(migration).toContain("module_key = 'common_business_identity'");
    expect(migration).toContain(
      "question->>'key' <> 'preferred_contact_method'",
    );
    expect(migration).toContain(
      "question->>'key' = 'preferred_contact_method'",
    );
    expect(migration).not.toMatch(/delete\s+from\s+public\.question_modules/i);
    expect(migration).not.toMatch(/grant|revoke|row level security/i);
  });

  it("retires goals and adds required history facts without changing security", () => {
    const migrationPath = join(
      migrationDirectory,
      "202607180014_customer_ready_questionnaire.sql",
    );
    const migrationBytes = readFileSync(migrationPath);
    const migration = new TextDecoder("utf-8", { fatal: true }).decode(
      migrationBytes,
    );

    function definitionFor(key: string) {
      const condition = `where question->>'key' = '${key}'`;
      const end = migration.indexOf(condition);
      const start = migration.lastIndexOf(
        "update public.question_modules",
        end,
      );
      expect(start).toBeGreaterThanOrEqual(0);
      expect(end).toBeGreaterThan(start);
      return migration.slice(start, end + condition.length);
    }

    function expectStructuredQuestion(
      key: string,
      type: string,
      sortOrder: number,
      expectedOptions: string[],
    ) {
      const definition = definitionFor(key);
      expect(definition).toContain("jsonb_build_array(");
      expect(definition).toContain("jsonb_build_object(");
      expect(definition).toContain(`'key', '${key}'`);
      expect(definition).toMatch(/'label',\s*'[^']+'/);
      expect(definition).toContain(`'type', '${type}'`);
      expect(definition).toContain("'options', jsonb_build_array(");
      expect(definition).toContain(`'sortOrder', ${sortOrder}`);
      expect(definition).toContain("and not exists (");
      for (const option of expectedOptions) {
        expect(definition).toContain(`'${option}'`);
      }
    }

    expect(migration).toMatch(/^begin;/);
    expect(migration.trimEnd()).toMatch(/commit;$/);
    expect(migration).not.toMatch(
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\ufffd]/,
    );
    expect(migration).toContain("('priority_goals')");
    expect(migration).toContain("('success_definition')");
    expect(migration).toContain("('process_expectation')");
    expect(
      migration.match(/'key',\s*'verification_methods_used'/g),
    ).toHaveLength(1);
    expect(migration.match(/'key',\s*'google_notice_type'/g)).toHaveLength(1);
    expectStructuredQuestion("verification_methods_used", "multi_select", 65, [
      "영상 인증",
      "실시간 영상 통화",
      "전화 또는 문자",
      "이메일",
      "우편",
      "인증을 요청받지 않았어요",
      "잘 모르겠어요",
      "확인이 필요해요",
    ]);
    expectStructuredQuestion("google_notice_type", "single_select", 75, [
      "정책 위반 안내",
      "인증 실패 또는 추가 인증 요청",
      "중복 또는 소유권 관련 안내",
      "구체적인 사유가 없었어요",
      "안내를 찾지 못했어요",
      "잘 모르겠어요",
      "확인이 필요해요",
    ]);
    const rawJsonBlocks = [
      ...migration.matchAll(/\$json\$([\s\S]*?)\$json\$::jsonb/g),
    ];
    for (const match of rawJsonBlocks) {
      expect(() => JSON.parse(match[1] ?? "")).not.toThrow();
    }
    expect(rawJsonBlocks).toHaveLength(0);
    expect(migration).toContain("module_key = 'common_history'");
    expect(migration).toContain("is_active = false");
    expect(migration).toContain("'common_goals'");
    expect(migration).not.toMatch(/delete\s+from\s+public\.question_modules/i);
    expect(migration).not.toMatch(
      /\b(?:grant|revoke)\b|row level security|\bstorage\.|\bauth\./i,
    );
  });
});
