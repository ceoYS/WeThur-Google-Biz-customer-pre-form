// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FormProvider, useForm } from "react-hook-form";

import { EvidenceUploader } from "@/components/intake/evidence-uploader";
import type { IntakePayloadInput } from "@/lib/schemas/intake";

afterEach(cleanup);

function Harness() {
  const form = useForm<IntakePayloadInput>({
    defaultValues: {
      schemaVersion: 1,
      answers: {},
      historyEvents: [],
      profileCandidates: [],
      thirdParties: [],
      website: "",
    },
  });
  return (
    <FormProvider {...form}>
      <EvidenceUploader
        token="synthetic-test-token"
        requestedEvidence={[
          {
            category: "business_registration",
            label: "사업자등록증",
            helpText: null,
            required: false,
          },
        ]}
        initialFiles={[]}
      />
    </FormProvider>
  );
}

describe("customer evidence wording", () => {
  it("uses customer-friendly secure upload language and explicit credential safety", () => {
    render(<Harness />);

    expect(
      screen.getByRole("button", { name: "자료 안전하게 업로드" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "업로드한 자료는 외부에 공개되지 않으며, 해당 사건 검토 목적으로만 사용됩니다.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Google 비밀번호, OTP, 복구코드/),
    ).toBeInTheDocument();
    expect(screen.getByText(/파일당 15 MB · 전체 15개/)).toBeInTheDocument();
  });
});
