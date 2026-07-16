import { NextResponse, type NextRequest } from "next/server";

import { getCurrentAdmin } from "@/lib/admin-auth";
import { generateCaseCode } from "@/lib/case-code";
import { getServerEnvironment } from "@/lib/env.server";
import {
  assertHoneypotEmpty,
  assertSameOrigin,
  consumeRateLimit,
  RequestSecurityError,
} from "@/lib/request-security";
import { createCaseSchema } from "@/lib/schemas/case";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  buildIntakeUrl,
  generateIntakeToken,
  hashIntakeToken,
} from "@/lib/tokens";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const admin = await getCurrentAdmin();
    if (!admin)
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 },
      );

    const allowed = await consumeRateLimit({
      request,
      action: "admin_create_case",
      limit: 30,
      windowSeconds: 3_600,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "요청이 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 },
      );
    }

    const payload: unknown = await request.json();
    const parsed = createCaseSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "입력 내용을 다시 확인해주세요.",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    assertHoneypotEmpty(parsed.data.website);

    const environment = getServerEnvironment();
    const service = createServiceRoleClient();
    const token = generateIntakeToken();
    const tokenHash = hashIntakeToken(token, environment.TOKEN_HASH_SECRET);
    let caseId: string | null = null;
    let caseCode = "";

    for (let attempt = 0; attempt < 3; attempt += 1) {
      caseCode = generateCaseCode();
      const { data, error } = await service.rpc(
        "create_case_with_configuration",
        {
          p_payload: {
            ...parsed.data,
            caseCode,
            tokenHash,
            actorId: admin.id,
            assignedAdminId: parsed.data.assignedAdminId ?? admin.id,
          },
        },
      );

      if (!error && typeof data === "string") {
        caseId = data;
        break;
      }
      if (error?.code !== "23505") break;
    }

    if (!caseId) {
      return NextResponse.json(
        {
          error:
            "사건을 생성하지 못했습니다. 설정을 확인한 뒤 다시 시도해주세요.",
        },
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
      { error: "요청을 처리하지 못했습니다." },
      { status: 400 },
    );
  }
}
