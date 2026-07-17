import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (...segments: string[]) =>
  readFileSync(join(root, ...segments), "utf8");

describe("production mutation integrity contract", () => {
  it("serializes customer evidence mutations with final submission", () => {
    const migration = read(
      "supabase",
      "migrations",
      "202607170011_customer_evidence_mutations.sql",
    );
    const uploadRoute = read(
      "src",
      "app",
      "api",
      "intake",
      "[token]",
      "evidence",
      "route.ts",
    );
    const deleteRoute = read(
      "src",
      "app",
      "api",
      "intake",
      "[token]",
      "evidence",
      "[evidenceId]",
      "route.ts",
    );

    expect(migration.match(/for update;/g)).toHaveLength(2);
    expect(migration).toContain("message = 'case_not_writable'");
    expect(migration).toContain(
      "revoke all on function public.register_customer_case_evidence(text, jsonb)",
    );
    expect(migration).toContain(
      "grant execute on function public.delete_customer_case_evidence(text, uuid)\nto service_role",
    );
    expect(uploadRoute).toContain(
      '.rpc(\n      "register_customer_case_evidence"',
    );
    expect(uploadRoute).toContain("자료는 최대 15개까지 업로드할 수 있습니다.");
    expect(deleteRoute).toContain(
      '.rpc(\n      "delete_customer_case_evidence"',
    );
  });

  it("uses optimistic predicates for administrator status transitions", () => {
    const caseRoute = read(
      "src",
      "app",
      "api",
      "admin",
      "cases",
      "[id]",
      "route.ts",
    );
    const followUpRoute = read(
      "src",
      "app",
      "api",
      "admin",
      "cases",
      "[id]",
      "follow-ups",
      "[requestId]",
      "route.ts",
    );

    expect(caseRoute).toContain('.eq("status", current.status)');
    expect(followUpRoute).toContain('.eq("status", current.status)');
    expect(caseRoute).toContain("if (!updated)");
    expect(followUpRoute).toContain("if (!updated)");
  });

  it("builds authentication redirects from the configured application URL", () => {
    const callbackRoute = read("src", "app", "auth", "callback", "route.ts");

    expect(callbackRoute).toContain("resolveAdminRedirectUrl(");
    expect(callbackRoute).toContain("environment.APP_URL");
    expect(callbackRoute).not.toContain("new URL(nextPath, request.url)");
  });
});
