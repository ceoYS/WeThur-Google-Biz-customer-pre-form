// jsdom is a transitive Vitest dependency without bundled declarations here.
// @ts-expect-error -- the runtime API is exercised directly in this test.
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ModuleOption } from "@/components/admin/case-creation-form";
import type { CreateCaseInput } from "@/lib/schemas/case";

const routerRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}));

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://app.example.test",
});
installDomGlobals(dom.window);

const { cleanup, fireEvent, render, screen, waitFor } =
  await import("@testing-library/react");
const { CaseConfigurationEditor } =
  await import("@/components/admin/case-configuration-editor");

const caseId = "11111111-1111-4111-8111-111111111111";
const adminId = "22222222-2222-4222-8222-222222222222";
const modules: ModuleOption[] = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    moduleKey: "common_identity",
    moduleType: "common",
    title: "공통 사실 확인",
    description: "가상 공통 모듈",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    moduleKey: "industry_synthetic",
    moduleType: "industry",
    title: "가상 업종",
    description: "가상 업종 모듈",
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    moduleKey: "issue_synthetic",
    moduleType: "issue",
    title: "가상 이슈",
    description: "가상 이슈 모듈",
  },
];

const initialValues: CreateCaseInput = {
  businessName: "가상 테스트 사업장",
  industryKey: "industry_synthetic",
  customerName: "가상 담당자",
  customerPhone: "000-0000-0000",
  customerContactChannel: "테스트 채널",
  customerIntro:
    "가상 테스트 사건의 Google 지도 등록 흐름을 안전하게 확인합니다.",
  expectedCompletionMinutes: 25,
  moduleIds: modules.map((module) => module.id),
  knownFacts: [
    {
      fieldKey: "sign_name",
      value: "첫 번째 가상 간판",
      sourceType: "admin_prefill",
      sourceNote: "첫 번째 출처",
      customerCanEdit: true,
    },
    {
      fieldKey: "official_address",
      value: "두 번째 가상 주소",
      sourceType: "document",
      sourceNote: "두 번째 출처",
      customerCanEdit: false,
    },
  ],
  profileCandidates: [
    {
      existingId: "66666666-6666-4666-8666-666666666666",
      mapsUrl: "https://maps.example.test/first",
      displayedName: "첫 번째 가상 프로필",
      displayedAddress: "가상 주소 1",
      displayedFloor: "2층",
      mapPinNotes: "첫 번째 핀",
      displayedPhone: "000-0000-0001",
      displayedWebsite: "https://first.example.test",
      displayedCategory: "가상 카테고리 1",
      rating: 4.3,
      reviewCount: 17,
      possibleCreator: "가상 관리자 1",
      customerControlsProfile: "확인 필요",
      ownershipRequestStatus: "요청 전",
      relationNotes: "첫 번째 관계",
      independentBusinessSignals: {},
    },
    {
      existingId: "77777777-7777-4777-8777-777777777777",
      mapsUrl: "https://maps.example.test/second",
      displayedName: "두 번째 가상 프로필",
      displayedAddress: "가상 주소 2",
      displayedFloor: "3층",
      displayedPhone: "000-0000-0002",
      displayedWebsite: "https://second.example.test",
      displayedCategory: "가상 카테고리 2",
      rating: 3.8,
      reviewCount: 9,
      relationNotes: "두 번째 관계",
      independentBusinessSignals: {},
    },
  ],
  customQuestions: [
    {
      sectionKey: "history_summary",
      questionKey: "synthetic_first",
      label: "첫 번째 가상 추가 질문",
      helpText: "첫 번째 도움말",
      questionType: "textarea",
      choices: [],
      required: false,
      conditionalLogic: {},
    },
    {
      sectionKey: "changes",
      questionKey: "synthetic_second",
      label: "두 번째 가상 추가 질문",
      helpText: "두 번째 도움말",
      questionType: "text",
      choices: [],
      required: false,
      conditionalLogic: {},
    },
  ],
  requestedEvidence: [
    {
      evidenceCategory: "synthetic_first",
      label: "첫 번째 가상 자료",
      helpText: "첫 번째 자료 도움말",
      required: false,
    },
    {
      evidenceCategory: "synthetic_second",
      label: "두 번째 가상 자료",
      helpText: "두 번째 자료 도움말",
      required: true,
    },
  ],
  assignedAdminId: adminId,
  website: "",
};

function renderEditor(mode: "edit" | "clone" = "edit") {
  return render(
    <CaseConfigurationEditor
      caseId={caseId}
      modules={modules}
      admins={[{ id: adminId, label: "가상 관리자" }]}
      initialValues={initialValues}
      mode={mode}
    />,
  );
}

describe("case configuration editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads selected modules and ordered setup values for an unstarted case", () => {
    renderEditor();

    expect(screen.getByDisplayValue("가상 테스트 사업장")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /공통 사실 확인/ }),
    ).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /가상 이슈/ })).toBeChecked();
    expect(screen.getAllByLabelText("필드 키")).toHaveLength(2);
    expect(screen.getAllByLabelText("필드 키")[0]).toHaveValue("sign_name");
    expect(screen.getAllByLabelText("필드 키")[1]).toHaveValue(
      "official_address",
    );
    expect(screen.getAllByLabelText("표시명")[0]).toHaveValue(
      "첫 번째 가상 프로필",
    );
    expect(screen.getAllByLabelText("표시명")[1]).toHaveValue(
      "두 번째 가상 프로필",
    );
    expect(screen.getAllByLabelText("평점")[0]).toHaveValue(4.3);
    expect(screen.getAllByLabelText("리뷰 수")[0]).toHaveValue(17);
    expect(screen.getAllByLabelText("질문")[0]).toHaveValue(
      "첫 번째 가상 추가 질문",
    );
    expect(screen.getAllByLabelText("질문")[1]).toHaveValue(
      "두 번째 가상 추가 질문",
    );
    expect(screen.getAllByLabelText("고객 표시 이름")[0]).toHaveValue(
      "첫 번째 가상 자료",
    );
    expect(screen.getAllByLabelText("고객 표시 이름")[1]).toHaveValue(
      "두 번째 가상 자료",
    );
  });

  it("saves through the existing case endpoint and keeps the button disabled while pending", async () => {
    let resolveResponse: ((response: Response) => void) | undefined;
    const pending = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(pending);
    vi.stubGlobal("fetch", fetchMock);
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "사건 설정 저장" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "저장 중" })).toBeDisabled(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/cases/${caseId}/configuration`,
      expect.objectContaining({ method: "PUT" }),
    );

    resolveResponse?.(
      new Response(JSON.stringify({ updated: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(
      await screen.findByText(
        "사건 설정을 저장했습니다. 기존 고객 링크에는 변경된 설정이 반영됩니다.",
      ),
    ).toBeInTheDocument();
    expect(routerRefresh).toHaveBeenCalledTimes(1);
  });

  it("creates one new-link request and shows the one-time clone result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          caseId: "88888888-8888-4888-8888-888888888888",
          caseCode: "WTH-SYNTHETIC1",
          intakeUrl: `https://app.example.test/intake/${"s".repeat(43)}`,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderEditor("clone");

    fireEvent.click(
      screen.getByRole("button", {
        name: "새 사건과 보안 링크 만들기",
      }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "새 사건과 보안 링크를 만들었습니다.",
      }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/cases/${caseId}/clone`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(
      screen.getByRole("link", { name: "원본 사건으로 돌아가기" }),
    ).toHaveAttribute("href", `/admin/cases/${caseId}`);
    expect(screen.getByText("WTH-SYNTHETIC1", { exact: false })).toBeVisible();
  });

  it("uses a mobile-first layout without a fixed form width", () => {
    const { container } = renderEditor("clone");
    expect(container.querySelector("form")).not.toHaveClass("min-w-");
    expect(
      screen.getByRole("button", {
        name: "새 사건과 보안 링크 만들기",
      }).parentElement,
    ).toHaveClass("flex-col", "sm:flex-row");
  });
});

function installDomGlobals(window: Window) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: window,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: window.document,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: window.navigator,
  });
  for (const property of Object.getOwnPropertyNames(window)) {
    if (property in globalThis) continue;
    Object.defineProperty(
      globalThis,
      property,
      Object.getOwnPropertyDescriptor(window, property) ?? {
        configurable: true,
        value: undefined,
      },
    );
  }
}
