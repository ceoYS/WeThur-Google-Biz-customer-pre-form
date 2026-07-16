import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

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
});
