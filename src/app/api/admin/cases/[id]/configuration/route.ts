import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentAdmin } from "@/lib/admin-auth";
import {
  assertHoneypotEmpty,
  assertSameOrigin,
  RequestSecurityError,
} from "@/lib/request-security";
import { assertContentLength, assertJsonRequest } from "@/lib/route-input";
import { createCaseSchema } from "@/lib/schemas/case";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    assertJsonRequest(request);
    assertContentLength(request, 512 * 1024);
    const admin = await getCurrentAdmin();
    if (!admin)
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 },
      );
    const idResult = z.uuid().safeParse((await context.params).id);
    const payloadResult = createCaseSchema.safeParse(await request.json());
    if (!idResult.success || !payloadResult.success)
      return NextResponse.json(
        { error: "사건 설정을 다시 확인해주세요." },
        { status: 400 },
      );
    assertHoneypotEmpty(payloadResult.data.website);

    const { data, error } = await createServiceRoleClient().rpc(
      "update_case_configuration",
      {
        p_case_id: idResult.data,
        p_payload: payloadResult.data,
        p_actor_id: admin.id,
      },
    );
    if (error?.message.includes("case_not_found"))
      return NextResponse.json(
        { error: "사건을 찾을 수 없습니다." },
        { status: 404 },
      );
    if (
      error?.message.includes("configuration_not_editable") ||
      error?.message.includes("configuration_locked")
    )
      return NextResponse.json(
        {
          error:
            "고객이 이미 작성을 시작했거나 제출을 완료하여 사건 설정을 수정할 수 없습니다.",
        },
        { status: 409 },
      );
    if (error || !data)
      return NextResponse.json(
        { error: "사건 설정을 저장하지 못했습니다." },
        { status: 400 },
      );
    return NextResponse.json(
      { updated: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof RequestSecurityError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "사건 설정을 저장하지 못했습니다." },
      { status: 400 },
    );
  }
}
