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
    screen.getByText(`${String(current).padStart(2, "0")} / 07`, {
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

    expectStep(1, 14);
    for (const [step, progress] of [
      [2, 29],
      [3, 43],
      [4, 57],
      [5, 71],
      [6, 86],
      [7, 100],
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
    expectStep(2, 29);
  });

  it("ignores form submission before the final step", async () => {
    const { container } = renderIntake(
      createBundle({ questions: [finalConfirmation] }),
    );

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expectStep(1, 14));
    expect(requestSubmitButton()).not.toBeInTheDocument();
  });

  it("does not permit a direct first-to-final jump through the sidebar", () => {
    renderIntake();

    const finalStep = screen.getByRole("button", {
      name: /7\. 마지막으로 함께 확인해주세요/,
    });
    expect(finalStep).toBeDisabled();
    fireEvent.click(finalStep);

    expectStep(1, 14);
  });

  it("returns one step at a time and never goes below the first step", () => {
    renderIntake();
    const previous = screen.getByRole("button", { name: /이전/ });
    expect(previous).toBeDisabled();

    for (let index = 0; index < 6; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: /다음 질문/ }));
    }
    fireEvent.click(screen.getByRole("button", { name: /이전/ }));
    expectStep(6, 86);
    fireEvent.click(screen.getByRole("button", { name: /이전/ }));
    expectStep(5, 71);
  });

  it("restores draft answers but starts a reloaded form at the first step", () => {
    const initial = renderIntake(
      createBundle({ questions: [optionalQuestion] }),
    );
    fireEvent.click(screen.getByRole("button", { name: /다음 질문/ }));
    expectStep(2, 29);
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

    expectStep(1, 14);
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
    expectStep(2, 29);
    fireEvent.click(screen.getByRole("button", { name: /다음 질문/ }));
    expectStep(3, 43);
    expect(screen.getByLabelText("세 번째 단계 질문")).toBeInTheDocument();
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
    expectStep(2, 29);

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
    expectStep(2, 29);
  });

  it("keeps the current step when draft saving fails", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "임시 저장하지 못했습니다." }),
    });
    vi.stubGlobal("fetch", request);
    renderIntake();
    fireEvent.click(screen.getByRole("button", { name: /다음 질문/ }));
    expectStep(2, 29);

    fireEvent.click(screen.getByRole("button", { name: /여기까지 저장/ }));

    await waitFor(() =>
      expect(
        screen.getByText("임시 저장하지 못했습니다.", {
          selector: 'p[role="status"]',
        }),
      ).toBeInTheDocument(),
    );
    expectStep(2, 29);
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
    expectStep(1, 14);
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
    expectStep(1, 14);
  });
});

function requestSubmitButton() {
  return screen.queryByRole("button", { name: "최종 제출하기" });
}
