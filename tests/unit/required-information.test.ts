import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  defaultRequestedEvidence,
  prefillFieldPresentation,
  requiredInformationMatrix,
} from "@/lib/required-information";
import { createEmptyProfileCandidate } from "@/lib/schemas/intake";

describe("required customer information matrix", () => {
  it("maps every required business, history, profile, evidence, and confirmation group", () => {
    expect(
      new Set(requiredInformationMatrix.map((item) => item.category)),
    ).toEqual(
      new Set(["business", "history", "profile", "evidence", "confirmation"]),
    );
    for (const item of requiredInformationMatrix) {
      expect(item.keys.length).toBeGreaterThan(0);
      expect([
        "admin_prefill",
        "customer_verify_edit",
        "customer_answer",
        "customer_upload",
        "system_notice",
        "remove",
      ]).toContain(item.classification);
      expect(item.operationalUse.length).toBeGreaterThan(10);
    }
  });

  it("covers every requested evidence category in the administrator defaults", () => {
    const expected = [
      "business_registration",
      "operating_permit",
      "exterior_photo",
      "permanent_sign_photo",
      "entrance_photo",
      "floor_operation_evidence",
      "past_google_email",
      "current_maps_profile",
      "contact_control_evidence",
    ];
    expect(
      defaultRequestedEvidence.map((item) => item.evidenceCategory),
    ).toEqual(expected);
  });

  it("keeps core business, history, and final-confirmation keys in the question catalog", () => {
    const catalog = readFileSync(
      join(
        process.cwd(),
        "supabase",
        "migrations",
        "202607160004_question_module_catalog.sql",
      ),
      "utf8",
    );
    for (const key of [
      "relationship_to_business",
      "authority_status",
      "sign_name",
      "entrance_sign_name",
      "registration_name",
      "permit_name",
      "official_address",
      "floor_structure",
      "primary_activity",
      "opening_hours",
      "official_phone",
      "official_website",
      "first_registration_period",
      "creation_attempt_count",
      "suspension_count",
      "account_count",
      "third_party_count",
      "old_account_access_status",
      "appeal_status",
      "recreated_during_appeal",
      "overall_history",
      "final_confirmation",
      "credential_confirmation",
      "scope_confirmation",
    ]) {
      expect(catalog).toContain(`"key":"${key}"`);
    }
  });

  it("supports prefill-and-correction for known business facts and all candidate fields", () => {
    for (const key of [
      "registration_name",
      "official_address",
      "primary_activity",
      "overall_history",
    ]) {
      expect(prefillFieldPresentation[key]).toBeDefined();
    }

    expect(createEmptyProfileCandidate()).toMatchObject({
      mapsUrl: "",
      displayedName: "",
      displayedAddress: "",
      displayedFloor: "",
      displayedCategory: "",
      displayedPhone: "",
      displayedWebsite: "",
      relationNotes: "",
      possibleCreator: "",
      customerControlsProfile: "",
      ownershipRequestStatus: "",
    });
  });

  it("adds the missing verification and Google-notice facts while retiring goals", () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        "supabase",
        "migrations",
        "202607180014_customer_ready_questionnaire.sql",
      ),
      "utf8",
    );
    expect(migration).toContain('"key":"verification_methods_used"');
    expect(migration).toContain('"key":"google_notice_type"');
    for (const key of [
      "priority_goals",
      "success_definition",
      "process_expectation",
      "future_location_standard",
    ]) {
      expect(migration).toContain(`('${key}')`);
    }
    expect(migration).toContain("'common_goals'");
    expect(migration).toContain("is_active = false");
  });

  it("does not require retired goals in the administrator workspace or case editor", () => {
    const workspace = readFileSync(
      join(process.cwd(), "src", "lib", "case-workspace.ts"),
      "utf8",
    );
    const editorPage = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "admin",
        "cases",
        "[id]",
        "edit",
        "page.tsx",
      ),
      "utf8",
    );
    const workspaceView = readFileSync(
      join(
        process.cwd(),
        "src",
        "components",
        "admin",
        "workspace",
        "case-workspace-view.tsx",
      ),
      "utf8",
    );

    expect(workspace).not.toContain('.from("customer_goals")');
    expect(editorPage).toContain('question.section_key !== "goals"');
    expect(workspaceView).not.toContain("고객이 원하는 결과");
  });
});
