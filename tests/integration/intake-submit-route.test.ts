import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  loadPublicIntakeBundle: vi.fn(),
  getServerEnvironment: vi.fn(),
  createServiceRoleClient: vi.fn(),
  rpc: vi.fn(),
  generateAndStoreDiagnosis: vi.fn(),
  recordDiagnosisFailure: vi.fn(),
  deliverSubmissionIntegrations: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/request-security", () => ({
  assertHoneypotEmpty: vi.fn(),
  assertSameOrigin: vi.fn(),
  consumeRateLimit: mocks.consumeRateLimit,
  RequestSecurityError: class RequestSecurityError extends Error {
    status = 400;
  },
}));
vi.mock("@/lib/public-intake", () => ({
  loadPublicIntakeBundle: mocks.loadPublicIntakeBundle,
}));
vi.mock("@/lib/env.server", () => ({
  getServerEnvironment: mocks.getServerEnvironment,
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));
vi.mock("@/lib/diagnosis-service", () => ({
  generateAndStoreDiagnosis: mocks.generateAndStoreDiagnosis,
  recordDiagnosisFailure: mocks.recordDiagnosisFailure,
}));
vi.mock("@/lib/submission-delivery", () => ({
  deliverSubmissionIntegrations: mocks.deliverSubmissionIntegrations,
}));

import { POST } from "@/app/api/intake/[token]/submit/route";

const origin = "https://app.example.test";
const token = "s".repeat(43);
const confirmationQuestions = [
  "final_confirmation",
  "credential_confirmation",
  "scope_confirmation",
].map((key, index) => ({
  key,
  sectionKey: "confirmation" as const,
  label: `필수 확인 ${index + 1}`,
  type: "confirmation" as const,
  options: [],
  required: true,
  sortOrder: index,
  source: "module" as const,
  sourceKey: "common_confirmation",
}));

function payload(confirmed = true) {
  return {
    schemaVersion: 1,
    answers: confirmed
      ? {
          final_confirmation: true,
          credential_confirmation: true,
          scope_confirmation: true,
        }
      : {},
    historyEvents: [],
    profileCandidates: [],
    thirdParties: [],
    website: "",
  };
}

function request(body = payload()) {
  return new NextRequest(`${origin}/api/intake/${token}/submit`, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function submit(body = payload()) {
  return POST(request(body), { params: Promise.resolve({ token }) });
}

describe("public intake final submission route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeRateLimit.mockResolvedValue(true);
    mocks.getServerEnvironment.mockReturnValue({
      TOKEN_HASH_SECRET: "synthetic-test-secret-that-is-at-least-32-characters",
    });
    mocks.loadPublicIntakeBundle.mockResolvedValue({
      intakeStatus: "draft",
      questions: confirmationQuestions,
    });
    mocks.createServiceRoleClient.mockReturnValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({
      data: {
        case_id: "11111111-1111-4111-8111-111111111111",
        case_code: "CASE-TEST",
        business_name: "가상 테스트 사업장",
        submitted_at: "2026-07-18T00:00:00.000Z",
      },
      error: null,
    });
    mocks.generateAndStoreDiagnosis.mockResolvedValue({});
    mocks.recordDiagnosisFailure.mockResolvedValue(undefined);
    mocks.deliverSubmissionIntegrations.mockResolvedValue(undefined);
  });

  it("rejects unchecked confirmations before the transactional RPC", async () => {
    const response = await submit(payload(false));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "제출 전 필수 확인 항목을 모두 체크해주세요.",
      missing: [
        "final_confirmation",
        "credential_confirmation",
        "scope_confirmation",
      ],
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("calls submit_case_intake once and then runs diagnosis and notification", async () => {
    const response = await submit();

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ submitted: true });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "submit_case_intake",
      expect.objectContaining({
        p_payload: expect.objectContaining(payload()),
      }),
    );
    expect(mocks.generateAndStoreDiagnosis).toHaveBeenCalledTimes(1);
    expect(mocks.deliverSubmissionIntegrations).toHaveBeenCalledTimes(1);
  });

  it("does not expose a raw database error", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "provider database constraint secret_detail" },
    });

    const response = await submit();
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "제출하지 못했습니다. 잠시 후 다시 시도해주세요.",
    });
    expect(JSON.stringify(body)).not.toContain("provider");
    expect(JSON.stringify(body)).not.toContain("constraint");
  });

  it("keeps a committed submission successful when diagnosis logging fails", async () => {
    mocks.generateAndStoreDiagnosis.mockRejectedValue(
      new Error("diagnosis provider failure"),
    );
    mocks.recordDiagnosisFailure.mockRejectedValue(
      new Error("activity log failure"),
    );

    const response = await submit();

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ submitted: true });
    expect(mocks.recordDiagnosisFailure).toHaveBeenCalledTimes(1);
  });

  it("keeps a committed submission successful when notification delivery fails", async () => {
    mocks.deliverSubmissionIntegrations.mockRejectedValue(
      new Error("notification provider failure"),
    );

    const response = await submit();

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ submitted: true });
    expect(mocks.deliverSubmissionIntegrations).toHaveBeenCalledTimes(1);
  });
});
