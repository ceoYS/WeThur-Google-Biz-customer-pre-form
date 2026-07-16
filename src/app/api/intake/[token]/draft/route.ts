import { NextResponse, type NextRequest } from "next/server";

import { getServerEnvironment } from "@/lib/env.server";
import {
  assertHoneypotEmpty,
  assertSameOrigin,
  consumeRateLimit,
  RequestSecurityError,
} from "@/lib/request-security";
import { assertContentLength, assertJsonRequest } from "@/lib/route-input";
import { intakePayloadSchema } from "@/lib/schemas/intake";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { hashIntakeToken, intakeTokenSchema } from "@/lib/tokens";

export async function PUT(
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
      action: "customer_save_draft",
      caseToken: tokenResult.data,
      limit: 60,
      windowSeconds: 3_600,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "저장 요청이 많습니다. 잠시 후 다시 시도해주세요." },
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

    const tokenHash = hashIntakeToken(
      tokenResult.data,
      getServerEnvironment().TOKEN_HASH_SECRET,
    );
    const { data, error } = await createServiceRoleClient().rpc(
      "save_case_intake_draft",
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
        { error: "임시 저장하지 못했습니다." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { savedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof RequestSecurityError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "임시 저장하지 못했습니다." },
      { status: 400 },
    );
  }
}
