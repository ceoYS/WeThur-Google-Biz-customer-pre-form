import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentAdmin } from "@/lib/admin-auth";
import { generateCaseCode } from "@/lib/case-code";
import { getServerEnvironment } from "@/lib/env.server";
import {
  assertHoneypotEmpty,
  assertSameOrigin,
  consumeRateLimit,
  RequestSecurityError,
} from "@/lib/request-security";
import { assertContentLength, assertJsonRequest } from "@/lib/route-input";
import {
  createCaseSchema,
  type ValidatedCreateCaseInput,
} from "@/lib/schemas/case";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  buildIntakeUrl,
  generateIntakeToken,
  hashIntakeToken,
} from "@/lib/tokens";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    assertJsonRequest(request);
    assertContentLength(request, 512 * 1024);
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 },
      );
    }

    const allowed = await consumeRateLimit({
      request,
      action: "admin_clone_case",
      limit: 30,
      windowSeconds: 3_600,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "요청이 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 },
      );
    }

    const idResult = z.uuid().safeParse((await context.params).id);
    const payloadResult = createCaseSchema.safeParse(await request.json());
    if (!idResult.success || !payloadResult.success) {
      return NextResponse.json(
        { error: "새 사건 설정을 다시 확인해주세요." },
        { status: 400 },
      );
    }
    assertHoneypotEmpty(payloadResult.data.website);

    const environment = getServerEnvironment();
    const service = createServiceRoleClient();
    const token = generateIntakeToken();
    const tokenHash = hashIntakeToken(token, environment.TOKEN_HASH_SECRET);
    const configuration = removeSourceCandidateIds(payloadResult.data);
    let caseId: string | null = null;
    let caseCode = "";

    for (let attempt = 0; attempt < 3; attempt += 1) {
      caseCode = generateCaseCode();
      const { data, error } = await service.rpc(
        "clone_case_with_configuration",
        {
          p_source_case_id: idResult.data,
          p_payload: {
            ...configuration,
            caseCode,
            tokenHash,
            actorId: admin.id,
            assignedAdminId: configuration.assignedAdminId ?? admin.id,
          },
          p_actor_id: admin.id,
        },
      );

      if (!error && typeof data === "string") {
        caseId = data;
        break;
      }
      if (error?.message.includes("case_not_found")) {
        return NextResponse.json(
          { error: "원본 사건을 찾을 수 없습니다." },
          { status: 404 },
        );
      }
      if (error?.message.includes("configuration_not_cloneable")) {
        return NextResponse.json(
          {
            error:
              "고객이 이미 작성을 시작했거나 제출을 완료하여 이 사건의 설정을 안전하게 복제할 수 없습니다.",
          },
          { status: 409 },
        );
      }
      if (error?.code !== "23505") break;
    }

    if (!caseId) {
      return NextResponse.json(
        { error: "새 사건과 보안 링크를 만들지 못했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        caseId,
        caseCode,
        intakeUrl: buildIntakeUrl(environment.APP_URL, token),
      },
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
      { error: "새 사건과 보안 링크를 만들지 못했습니다." },
      { status: 400 },
    );
  }
}

function removeSourceCandidateIds(
  configuration: ValidatedCreateCaseInput,
): ValidatedCreateCaseInput {
  return {
    ...configuration,
    profileCandidates: configuration.profileCandidates.map((candidate) => {
      const copy = { ...candidate };
      delete copy.existingId;
      return copy;
    }),
  };
}
