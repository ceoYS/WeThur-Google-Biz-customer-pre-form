// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IntakeShell } from "@/components/intake/intake-shell";
import type { ComposedQuestion } from "@/lib/question-modules";
import type { PublicIntakeBundle } from "@/lib/public-intake";
import { createEmptyProfileCandidate } from "@/lib/schemas/intake";

const replace = vi.fn();

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const optionalQuestion: ComposedQuestion = {
  key: "optional_context",
  sectionKey: "current_business",
  label: "선택 설명",
  type: "text",
  options: [],
  required: false,
  sortOrder: 1,
  source: "custom",
  sourceKey: "optional_context",
};

const finalConfirmation: ComposedQuestion = {
  key: "final_confirmation",
  sectionKey: "confirmation",
  label: "마지막 확인",
  type: "confirmation",
  options: [],
  required: true,
  sortOrder: 1,
  source: "module",
  sourceKey: "common_confirmation",
};

const credentialConfirmation: ComposedQuestion = {
  ...finalConfirmation,
  key: "credential_confirmation",
  label: "계정 보안정보를 제출하지 않았습니다.",
  sortOrder: 2,
};

const scopeConfirmation: ComposedQuestion = {
  ...finalConfirmation,
  key: "scope_confirmation",
  label: "Google의 결과를 보장하지 않음을 이해했습니다.",
  sortOrder: 3,
};

const requiredConfirmations = [
  finalConfirmation,
  credentialConfirmation,
  scopeConfirmation,
];

const retiredContactQuestion: ComposedQuestion = {
  key: "preferred_contact_method",
  sectionKey: "current_business",
  label: "추가 확인 연락 방법",
  type: "single_select",
  options: ["전화", "문자", "카카오톡", "이메일"],
  required: false,
  sortOrder: 2,
  source: "module",
  sourceKey: "common_business_identity",
};

function createBundle(
  overrides: Partial<PublicIntakeBundle> = {},
): PublicIntakeBundle {
  return {
    caseCode: "CASE-TEST",
    businessName: "가상 테스트 사업장",
    customerIntro: "테스트 안내",
    expectedCompletionMinutes: 20,
    intakeStatus: "link_ready",
    questions: [],
    prefilledFields: [],
    profileCandidates: [],
    requestedEvidence: [],
    evidenceFiles: [],
    draftPayload: null,
    ...overrides,
  };
}

function renderIntake(bundle = createBundle()) {
  return render(<IntakeShell token="synthetic-test-token" bundle={bundle} />);
}

function expectStep(current: number, progress: number) {
  expect(
    screen.getByText(`${String(current).padStart(2, "0")} / 06`, {
      exact: true,
    }),
  ).toBeInTheDocument();
  expect(screen.getByText(`${progress}%`)).toBeInTheDocument();
}

describe("customer intake step navigation", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.stubGlobal("scrollTo", vi.fn());
  });

  it("moves exactly one step for each next click", () => {
    renderIntake();

    expectStep(1, 17);
    for (const [step, progress] of [
      [2, 33],
      [3, 50],
      [4, 67],
      [5, 83],
      [6, 100],
    ] as const) {
      fireEvent.click(screen.getByRole("button", { name: /다음 질문/ }));
      expectStep(step, progress);
    }

    expect(
      screen.queryByRole("button", { name: /다음 질문/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "최종 제출하기" }),
    ).toBeInTheDocument();
  });

  it("does not submit the form when next is clicked", () => {
    const { container } = renderIntake();
    const submitted = vi.fn((event: Event) => event.preventDefault());
    container.querySelector("form")?.addEventListener("submit", submitted);

    const next = screen.getByRole("button", { name: /다음 질문/ });
    const clicked = vi.fn();
    next.addEventListener("click", clicked);
    expect(next).toHaveAttribute("type", "button");
    fireEvent.click(next);

    expect(clicked).toHaveBeenCalledTimes(1);
    expect(submitted).not.toHaveBeenCalled();
    expectStep(2, 33);
  });

  it("ignores form submission before the final step", async () => {
    const { container } = renderIntake(
      createBundle({ questions: [finalConfirmation] }),
    );

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expectStep(1, 17));
    expect(requestSubmitButton()).not.toBeInTheDocument();
  });

  it("does not permit a direct first-to-final jump through the sidebar", () => {
    renderIntake();

    const finalStep = screen.getByRole("button", {
      name: /6\. 마지막 확인/,
    });
    expect(finalStep).toBeDisabled();
    fireEvent.click(finalStep);

    expectStep(1, 17);
  });

  it("returns one step at a time and never goes below the first step", () => {
    renderIntake();
    const previous = screen.getByRole("button", { name: /이전/ });
    expect(previous).toBeDisabled();

    for (let index = 0; index < 5; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: /다음 질문/ }));
    }
    fireEvent.click(screen.getByRole("button", { name: /이전/ }));
    expectStep(5, 83);
    fireEvent.click(screen.getByRole("button", { name: /이전/ }));
    expectStep(4, 67);
  });

  it("restores draft answers but starts a reloaded form at the first step", () => {
    const initial = renderIntake(
      createBundle({ questions: [optionalQuestion] }),
    );
    fireEvent.click(screen.getByRole("button", { name: /다음 질문/ }));
    expectStep(2, 33);
    initial.unmount();

    renderIntake(
      createBundle({
        questions: [optionalQuestion],
        draftPayload: {
          schemaVersion: 1,
          answers: { optional_context: "저장된 답변" },
          historyEvents: [],
          profileCandidates: [],
          thirdParties: [],
          website: "",
        },
      }),
    );

    expectStep(1, 17);
    expect(screen.getByLabelText("선택 설명")).toHaveValue("저장된 답변");
  });

  it("replaces the external contact choice with the fixed Kmong notice", () => {
    renderIntake(createBundle({ questions: [retiredContactQuestion] }));

    expect(screen.queryByText("추가 확인 연락 방법")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /크몽을 통해 접수한 상담은 크몽 메시지에서만 이어갑니다/,
      ),
    ).toBeInTheDocument();
  });

  it("uses canonical section order even when questions arrive in another order", () => {
    const laterQuestion: ComposedQuestion = {
      ...optionalQuestion,
      key: "later_context",
      sectionKey: "changes",
      label: "세 번째 단계 질문",
      sourceKey: "later_context",
    };
    renderIntake(
      createBundle({ questions: [laterQuestion, optionalQuestion] }),
    );

    expect(screen.getByLabelText("선택 설명")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("세 번째 단계 질문"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /다음 질문/ }));
    expectStep(2, 33);
    fireEvent.click(screen.getByRole("button", { name: /다음 질문/ }));
    expectStep(3, 50);
    expect(screen.getByLabelText("세 번째 단계 질문")).toBeInTheDocument();
  });

  it("never renders the retired goals step even with a legacy question bundle", () => {
    renderIntake(
      createBundle({
        questions: [
          {
            ...optionalQuestion,
            key: "priority_goals",
            sectionKey: "goals",
            label: "이번 작업에서 우선 확인하고 싶은 결과를 골라주세요.",
          },
        ],
      }),
    );

    expect(
      screen.queryByText("이번 작업에서 우선 확인하고 싶은 결과를 골라주세요."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/대표님이 가장 원하는 결과/),
    ).not.toBeInTheDocument();
    expectStep(1, 17);
  });

  it("shows administrator prefill as an editable answer instead of asking again", () => {
    const registrationQuestion: ComposedQuestion = {
      ...optionalQuestion,
      key: "registration_name",
      label: "사업자등록증 상호를 확인해주세요.",
      sourceKey: "common_business_identity",
    };
    const candidate = createEmptyProfileCandidate();
    candidate.existingId = "11111111-1111-4111-8111-111111111111";
    candidate.mapsUrl = "https://maps.app.goo.gl/synthetic";
    candidate.displayedName = "가상 후보 A";
    candidate.displayedAddress = "서울시 가상구 테스트로 1";
    candidate.displayedCategory = "가상 업종";
    renderIntake(
      createBundle({
        questions: [registrationQuestion],
        prefilledFields: [
          {
            fieldKey: "registration_name",
            value: "가상 사전입력 상호",
            customerCanEdit: true,
          },
        ],
        profileCandidates: [candidate],
      }),
    );

    const input = screen.getByLabelText("사업자등록증 상호를 확인해주세요.");
    expect(input).toHaveValue("가상 사전입력 상호");
    expect(screen.getByText(/미리 확인한 내용/)).toHaveTextContent(
      "가상 사전입력 상호",
    );
    fireEvent.change(input, { target: { value: "가상 수정 상호" } });
    expect(input).toHaveValue("가상 수정 상호");

    for (let index = 0; index < 3; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: /다음 질문/ }));
    }
    expect(screen.getByLabelText("Google Maps 공유 링크")).toHaveValue(
      "https://maps.app.goo.gl/synthetic",
    );
    expect(screen.getByLabelText("표시된 업체명")).toHaveValue("가상 후보 A");
    fireEvent.change(screen.getByLabelText("표시된 업체명"), {
      target: { value: "가상 후보 A 수정" },
    });
    expect(screen.getByLabelText("표시된 업체명")).toHaveValue(
      "가상 후보 A 수정",
    );
  });
});

describe("customer intake draft safety", () => {
  beforeEach(() => {
    vi.stubGlobal("scrollTo", vi.fn());
  });

  it("omits undefined optional answers and saves without changing steps", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ savedAt: "2026-07-18T00:00:00.000Z" }),
    });
    vi.stubGlobal("fetch", request);
    renderIntake(createBundle({ questions: [optionalQuestion] }));
    fireEvent.click(screen.getByRole("button", { name: /다음 질문/ }));
    expectStep(2, 33);

    fireEvent.click(screen.getByRole("button", { name: /여기까지 저장/ }));

    await waitFor(() =>
      expect(
        screen.getByText(/안전하게 저장했습니다/, {
          selector: 'p[role="status"]',
        }),
      ).toBeInTheDocument(),
    );
    expect(request).toHaveBeenCalledTimes(1);
    const requestInit = request.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(requestInit.body))).toMatchObject({ answers: {} });
    expectStep(2, 33);
  });

  it("keeps the current step when draft saving fails", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "임시 저장하지 못했습니다." }),
    });
    vi.stubGlobal("fetch", request);
    renderIntake();
    fireEvent.click(screen.getByRole("button", { name: /다음 질문/ }));
    expectStep(2, 33);

    fireEvent.click(screen.getByRole("button", { name: /여기까지 저장/ }));

    await waitFor(() =>
      expect(
        screen.getByText("임시 저장하지 못했습니다.", {
          selector: 'p[role="status"]',
        }),
      ).toBeInTheDocument(),
    );
    expectStep(2, 33);
    expect(
      screen.queryByRole("button", { name: "최종 제출하기" }),
    ).not.toBeInTheDocument();
  });

  it("never exposes local Zod details or an unapproved server error", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: '[{"provider":"internal detail"}]' }),
    });
    vi.stubGlobal("fetch", request);
    renderIntake(createBundle({ questions: [optionalQuestion] }));

    fireEvent.click(screen.getByRole("button", { name: /여기까지 저장/ }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "임시 저장하지 못했습니다.",
      ),
    );
    expect(screen.getByRole("status")).not.toHaveTextContent("provider");
    expect(screen.getByRole("status")).not.toHaveTextContent("invalid_union");
    expectStep(1, 17);
  });

  it("maps local validation failures to a finite customer-safe message", async () => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    renderIntake(
      createBundle({
        draftPayload: {
          schemaVersion: 1,
          answers: { "Invalid-Key": "test" },
          historyEvents: [],
          profileCandidates: [],
          thirdParties: [],
          website: "",
        },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /여기까지 저장/ }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "작성 내용을 다시 확인해주세요.",
      ),
    );
    expect(screen.getByRole("status").textContent).not.toMatch(/[\[\]{}]/);
    expect(request).not.toHaveBeenCalled();
    expectStep(1, 17);
  });
});

describe("customer final submission", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.stubGlobal("scrollTo", vi.fn());
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("does not call the API, explains missing confirmations, and focuses the first one", async () => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    renderIntake(createBundle({ questions: requiredConfirmations }));
    advanceToFinalStep();

    fireEvent.click(screen.getByRole("button", { name: "최종 제출하기" }));

    expect(request).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "제출 전 필수 확인 항목을 모두 체크해주세요.",
    );
    const confirmations = screen.getAllByRole("checkbox");
    await waitFor(() => expect(confirmations[0]).toHaveFocus());
    expect(confirmations[0]).toHaveAttribute("aria-invalid", "true");
    expect(
      document.getElementById("question-container-final_confirmation"),
    ).toHaveClass("border-l-red-700");
  });

  it("calls the submit API exactly once, disables duplicate submission, and redirects on success", async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    const request = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    vi.stubGlobal("fetch", request);
    const { container } = renderIntake(
      createBundle({ questions: requiredConfirmations }),
    );
    advanceToFinalStep();
    checkAllConfirmations();

    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(
      screen.getByRole("button", { name: "안전하게 제출 중" }),
    ).toBeDisabled();
    expect(request).toHaveBeenCalledWith(
      "/api/intake/synthetic-test-token/submit",
      expect.objectContaining({ method: "POST" }),
    );

    resolveRequest?.({
      ok: true,
      json: async () => ({ submitted: true }),
    });
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/intake/synthetic-test-token/complete",
      ),
    );
  });

  it("stays on the final page and shows a safe message when the API fails", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "제출하지 못했습니다. 잠시 후 다시 시도해주세요.",
      }),
    });
    vi.stubGlobal("fetch", request);
    renderIntake(createBundle({ questions: requiredConfirmations }));
    advanceToFinalStep();
    checkAllConfirmations();

    fireEvent.click(screen.getByRole("button", { name: "최종 제출하기" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "제출하지 못했습니다. 잠시 후 다시 시도해주세요.",
      ),
    );
    expectStep(6, 100);
    expect(replace).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("never renders raw Zod, database, or provider details", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'ZodError: invalid_union [{"database":"provider_secret"}]',
      }),
    });
    vi.stubGlobal("fetch", request);
    renderIntake(createBundle({ questions: requiredConfirmations }));
    advanceToFinalStep();
    checkAllConfirmations();

    fireEvent.click(screen.getByRole("button", { name: "최종 제출하기" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "제출하지 못했습니다.",
      ),
    );
    expect(screen.getByRole("status")).not.toHaveTextContent("ZodError");
    expect(screen.getByRole("status")).not.toHaveTextContent("database");
    expect(screen.getByRole("status")).not.toHaveTextContent("provider_secret");
  });
});

describe("mocked customer-ready full flow", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.stubGlobal("scrollTo", vi.fn());
  });

  it("saves, resumes, moves sequentially, uploads, confirms, and submits without a database", async () => {
    const request = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/draft")) {
          return {
            ok: true,
            json: async () => ({ savedAt: "2026-07-18T00:00:00.000Z" }),
          };
        }
        if (url.endsWith("/evidence")) {
          return {
            ok: true,
            json: async () => ({
              evidence: {
                id: "11111111-1111-4111-8111-111111111111",
                category: "business_registration",
                originalFilename: "synthetic-evidence.pdf",
                sizeBytes: 100,
                customerDescription: null,
                linkType: null,
                linkClientId: null,
              },
            }),
          };
        }
        if (url.endsWith("/submit")) {
          return { ok: true, json: async () => ({ submitted: true }) };
        }
        throw new Error(`Unexpected mock request: ${url} ${init?.method}`);
      },
    );
    vi.stubGlobal("fetch", request);
    const baseBundle = createBundle({
      questions: [optionalQuestion, ...requiredConfirmations],
      requestedEvidence: [
        {
          category: "business_registration",
          label: "사업자등록증",
          helpText: null,
          required: false,
        },
      ],
    });

    const firstVisit = renderIntake(baseBundle);
    fireEvent.change(screen.getByLabelText("선택 설명"), {
      target: { value: "저장 후 복원할 가상 답변" },
    });
    fireEvent.click(screen.getByRole("button", { name: /여기까지 저장/ }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "안전하게 저장했습니다",
      ),
    );
    const draftCall = request.mock.calls.find(([url]) =>
      String(url).endsWith("/draft"),
    );
    const savedPayload = JSON.parse(
      String((draftCall?.[1] as RequestInit | undefined)?.body),
    ) as NonNullable<PublicIntakeBundle["draftPayload"]>;
    firstVisit.unmount();

    renderIntake(createBundle({ ...baseBundle, draftPayload: savedPayload }));
    expect(screen.getByLabelText("선택 설명")).toHaveValue(
      "저장 후 복원할 가상 답변",
    );
    for (const expected of [2, 3, 4, 5]) {
      fireEvent.click(screen.getByRole("button", { name: /다음 질문/ }));
      expectStep(expected, [33, 50, 67, 83][expected - 2]!);
    }

    const fileInput = screen.getByLabelText("파일");
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(["synthetic"], "synthetic-evidence.pdf", {
            type: "application/pdf",
          }),
        ],
      },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "자료 안전하게 업로드" }),
    );
    await waitFor(() =>
      expect(screen.getByText("synthetic-evidence.pdf")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /다음 질문/ }));
    expectStep(6, 100);
    checkAllConfirmations();
    fireEvent.click(screen.getByRole("button", { name: "최종 제출하기" }));

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/intake/synthetic-test-token/complete",
      ),
    );
    expect(
      request.mock.calls.filter(([url]) => String(url).endsWith("/draft")),
    ).toHaveLength(1);
    expect(
      request.mock.calls.filter(([url]) => String(url).endsWith("/evidence")),
    ).toHaveLength(1);
    expect(
      request.mock.calls.filter(([url]) => String(url).endsWith("/submit")),
    ).toHaveLength(1);
  });
});

function advanceToFinalStep() {
  for (let index = 0; index < 5; index += 1) {
    fireEvent.click(screen.getByRole("button", { name: /다음 질문/ }));
  }
  expectStep(6, 100);
}

function checkAllConfirmations() {
  for (const checkbox of screen.getAllByRole("checkbox")) {
    fireEvent.click(checkbox);
  }
}

function requestSubmitButton() {
  return screen.queryByRole("button", { name: "최종 제출하기" });
}
