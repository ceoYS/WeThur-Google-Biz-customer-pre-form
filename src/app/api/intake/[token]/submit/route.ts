import { NextResponse, type NextRequest } from "next/server";

import {
  generateAndStoreDiagnosis,
  recordDiagnosisFailure,
} from "@/lib/diagnosis-service";
import { getServerEnvironment } from "@/lib/env.server";
import { findMissingRequiredAnswers } from "@/lib/intake-validation";
import { loadPublicIntakeBundle } from "@/lib/public-intake";
import {
  assertHoneypotEmpty,
  assertSameOrigin,
  consumeRateLimit,
  RequestSecurityError,
} from "@/lib/request-security";
import { assertContentLength, assertJsonRequest } from "@/lib/route-input";
import { intakePayloadSchema } from "@/lib/schemas/intake";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { deliverSubmissionIntegrations } from "@/lib/submission-delivery";
import { hashIntakeToken, intakeTokenSchema } from "@/lib/tokens";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    assertSameOrigin(request);
    assertJsonRequest(request);
    assertContentLength(request, 2 * 1024 * 1024);
    const tokenResult = intakeTokenSchema.safeParse(
      (await context.params).token,
    );
    if (!tokenResult.success) {
      return NextResponse.json(
        { error: "유효하지 않은 고객 링크입니다." },
        { status: 404 },
      );
    }

    const allowed = await consumeRateLimit({
      request,
      action: "customer_submit_intake",
      caseToken: tokenResult.data,
      limit: 10,
      windowSeconds: 3_600,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "제출 요청이 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 },
      );
    }

    const parsed = intakePayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "작성 내용을 다시 확인해주세요." },
        { status: 400 },
      );
    }
    assertHoneypotEmpty(parsed.data.website);

    const bundle = await loadPublicIntakeBundle(tokenResult.data);
    if (!bundle)
      return NextResponse.json(
        { error: "고객 링크를 확인할 수 없습니다." },
        { status: 404 },
      );
    if (bundle.intakeStatus === "submitted") {
      return NextResponse.json(
        { error: "이미 제출된 사건입니다." },
        { status: 409 },
      );
    }
    const missing = findMissingRequiredAnswers(
      bundle.questions,
      parsed.data.answers,
    );
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: "마지막 필수 확인 항목을 확인해주세요.",
          missing: missing.map((item) => item.key),
        },
        { status: 400 },
      );
    }

    const tokenHash = hashIntakeToken(
      tokenResult.data,
      getServerEnvironment().TOKEN_HASH_SECRET,
    );
    const { data, error } = await createServiceRoleClient().rpc(
      "submit_case_intake",
      {
        p_token_hash: tokenHash,
        p_payload: parsed.data,
      },
    );
    if (error?.message.includes("already_submitted")) {
      return NextResponse.json(
        { error: "이미 제출된 사건입니다." },
        { status: 409 },
      );
    }
    if (error || !data) {
      return NextResponse.json(
        { error: "제출하지 못했습니다. 잠시 후 다시 시도해주세요." },
        { status: 400 },
      );
    }

    const submission = data as {
      case_id?: unknown;
      case_code?: unknown;
      business_name?: unknown;
      submitted_at?: unknown;
    };
    if (typeof submission.case_id === "string") {
      try {
        await generateAndStoreDiagnosis(submission.case_id, parsed.data);
      } catch {
        await recordDiagnosisFailure(submission.case_id);
      }
    }
    if (
      typeof submission.case_id === "string" &&
      typeof submission.case_code === "string" &&
      typeof submission.business_name === "string" &&
      typeof submission.submitted_at === "string"
    ) {
      await deliverSubmissionIntegrations({
        caseId: submission.case_id,
        caseCode: submission.case_code,
        businessName: submission.business_name,
        submittedAt: submission.submitted_at,
      });
    }

    return NextResponse.json(
      { submitted: true },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof RequestSecurityError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "제출하지 못했습니다." },
      { status: 400 },
    );
  }
}
