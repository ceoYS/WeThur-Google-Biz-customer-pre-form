import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentAdmin: vi.fn(),
  consumeRateLimit: vi.fn(),
  createServiceRoleClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin-auth", () => ({
  getCurrentAdmin: mocks.getCurrentAdmin,
}));
vi.mock("@/lib/request-security", () => ({
  assertHoneypotEmpty: vi.fn(),
  assertSameOrigin: vi.fn(),
  consumeRateLimit: mocks.consumeRateLimit,
  RequestSecurityError: class RequestSecurityError extends Error {
    status = 400;
  },
}));
vi.mock("@/lib/env.server", () => ({
  getServerEnvironment: () => ({
    APP_URL: "https://app.example.test",
    TOKEN_HASH_SECRET: "synthetic-secret-that-is-longer-than-32-characters",
  }),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

import { POST as cloneCase } from "@/app/api/admin/cases/[id]/clone/route";
import { PUT as updateCase } from "@/app/api/admin/cases/[id]/configuration/route";

const sourceCaseId = "11111111-1111-4111-8111-111111111111";
const newCaseId = "22222222-2222-4222-8222-222222222222";
const candidateId = "33333333-3333-4333-8333-333333333333";
const adminId = "44444444-4444-4444-8444-444444444444";
const moduleId = "55555555-5555-4555-8555-555555555555";

const configuration = {
  businessName: "가상 테스트 사업장",
  industryKey: "synthetic_service",
  customerName: "가상 담당자",
  customerPhone: "",
  customerContactChannel: "테스트 채널",
  customerIntro:
    "가상 테스트 사건의 Google 지도 등록 흐름을 안전하게 확인합니다.",
  expectedCompletionMinutes: 25,
  moduleIds: [moduleId],
  knownFacts: [
    {
      fieldKey: "sign_name",
      value: "가상 간판",
      sourceType: "admin_prefill",
      sourceNote: "",
      customerCanEdit: true,
    },
  ],
  profileCandidates: [
    {
      existingId: candidateId,
      mapsUrl: "https://maps.example.test/synthetic",
      displayedName: "가상 후보",
      displayedAddress: "가상 주소",
      displayedFloor: "3층",
      mapPinNotes: "가상 핀 메모",
      displayedPhone: "000-0000-0000",
      displayedWebsite: "https://profile.example.test",
      displayedCategory: "가상 업종",
      rating: 4.2,
      reviewCount: 12,
      possibleCreator: "미확인",
      customerControlsProfile: "확인 필요",
      ownershipRequestStatus: "요청 전",
      relationNotes: "가상 관계 메모",
      independentBusinessSignals: {},
    },
  ],
  customQuestions: [],
  requestedEvidence: [],
  assignedAdminId: adminId,
  website: "",
};

function request(path: string, method: "POST" | "PUT") {
  return new NextRequest(`https://app.example.test${path}`, {
    method,
    headers: {
      Origin: "https://app.example.test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(configuration),
  });
}

describe("administrator case setup mutation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentAdmin.mockResolvedValue({
      id: adminId,
      email: "admin@example.test",
      displayName: "가상 관리자",
    });
    mocks.consumeRateLimit.mockResolvedValue(true);
    mocks.createServiceRoleClient.mockReturnValue({ rpc: mocks.rpc });
  });

  it("updates only through the atomic configuration RPC and returns no token data", async () => {
    mocks.rpc.mockResolvedValue({ data: sourceCaseId, error: null });

    const response = await updateCase(
      request(`/api/admin/cases/${sourceCaseId}/configuration`, "PUT"),
      { params: Promise.resolve({ id: sourceCaseId }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ updated: true });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("update_case_configuration", {
      p_case_id: sourceCaseId,
      p_payload: expect.objectContaining({
        businessName: configuration.businessName,
        profileCandidates: expect.arrayContaining([
          expect.objectContaining({ rating: 4.2, reviewCount: 12 }),
        ]),
      }),
      p_actor_id: adminId,
    });
  });

  it.each(["configuration_not_editable", "configuration_locked"])(
    "blocks draft or submitted edits when the RPC reports %s",
    async (message) => {
      mocks.rpc.mockResolvedValue({ data: null, error: { message } });

      const response = await updateCase(
        request(`/api/admin/cases/${sourceCaseId}/configuration`, "PUT"),
        { params: Promise.resolve({ id: sourceCaseId }) },
      );

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error:
          "고객이 이미 작성을 시작했거나 제출을 완료하여 사건 설정을 수정할 수 없습니다.",
      });
    },
  );

  it("clones configuration with a new case and token hash while removing source row ids", async () => {
    mocks.rpc.mockResolvedValue({ data: newCaseId, error: null });

    const response = await cloneCase(
      request(`/api/admin/cases/${sourceCaseId}/clone`, "POST"),
      { params: Promise.resolve({ id: sourceCaseId }) },
    );
    const body = (await response.json()) as {
      caseId: string;
      caseCode: string;
      intakeUrl: string;
    };

    expect(response.status).toBe(201);
    expect(body.caseId).toBe(newCaseId);
    expect(body.caseCode).toMatch(/^WTH-/);
    expect(body.intakeUrl).toMatch(
      /^https:\/\/app\.example\.test\/intake\/[A-Za-z0-9_-]{43}$/,
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    const [rpcName, rpcArguments] = mocks.rpc.mock.calls[0] as [
      string,
      {
        p_source_case_id: string;
        p_payload: Record<string, unknown> & {
          tokenHash: string;
          profileCandidates: Array<Record<string, unknown>>;
        };
        p_actor_id: string;
      },
    ];
    expect(rpcName).toBe("clone_case_with_configuration");
    expect(rpcArguments.p_source_case_id).toBe(sourceCaseId);
    expect(rpcArguments.p_actor_id).toBe(adminId);
    expect(rpcArguments.p_payload.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(rpcArguments.p_payload.profileCandidates[0]).not.toHaveProperty(
      "existingId",
    );
    expect(rpcArguments.p_payload).not.toHaveProperty("draft_payload");
    expect(rpcArguments.p_payload).not.toHaveProperty("final_payload");
    const rawToken = body.intakeUrl.split("/").at(-1);
    expect(JSON.stringify(rpcArguments)).not.toContain(rawToken);
    expect(JSON.stringify(body)).not.toContain(
      rpcArguments.p_payload.tokenHash,
    );
  });

  it.each(["draft", "submitted"])(
    "blocks a %s case clone in the server transaction",
    async () => {
      mocks.rpc.mockResolvedValue({
        data: null,
        error: { message: "configuration_not_cloneable" },
      });

      const response = await cloneCase(
        request(`/api/admin/cases/${sourceCaseId}/clone`, "POST"),
        { params: Promise.resolve({ id: sourceCaseId }) },
      );

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error:
          "고객이 이미 작성을 시작했거나 제출을 완료하여 이 사건의 설정을 안전하게 복제할 수 없습니다.",
      });
    },
  );

  it("rejects non-administrators before either mutation RPC", async () => {
    mocks.getCurrentAdmin.mockResolvedValue(null);

    const editResponse = await updateCase(
      request(`/api/admin/cases/${sourceCaseId}/configuration`, "PUT"),
      { params: Promise.resolve({ id: sourceCaseId }) },
    );
    const cloneResponse = await cloneCase(
      request(`/api/admin/cases/${sourceCaseId}/clone`, "POST"),
      { params: Promise.resolve({ id: sourceCaseId }) },
    );

    expect(editResponse.status).toBe(401);
    expect(cloneResponse.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not expose raw database errors", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "database provider secret constraint detail" },
    });

    const response = await cloneCase(
      request(`/api/admin/cases/${sourceCaseId}/clone`, "POST"),
      { params: Promise.resolve({ id: sourceCaseId }) },
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "새 사건과 보안 링크를 만들지 못했습니다.",
    });
    expect(JSON.stringify(body)).not.toContain("provider");
    expect(JSON.stringify(body)).not.toContain("constraint");
  });
});
