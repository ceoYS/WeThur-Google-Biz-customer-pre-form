import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentAdmin } from "@/lib/admin-auth";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { assertContentLength, assertJsonRequest } from "@/lib/route-input";
import { createFollowUpSchema } from "@/lib/schemas/admin-workspace";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    assertJsonRequest(request);
    assertContentLength(request, 32 * 1024);
    const admin = await getCurrentAdmin();
    if (!admin)
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 },
      );
    const caseId = z.uuid().safeParse((await context.params).id);
    const body = createFollowUpSchema.safeParse(await request.json());
    if (!caseId.success || !body.success)
      return NextResponse.json(
        { error: "추가 질문 내용을 확인해주세요." },
        { status: 400 },
      );

    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("follow_up_requests")
      .insert({
        case_id: caseId.data,
        requested_by: admin.id,
        title: body.data.title,
        message: body.data.message,
        requested_items: body.data.requestedItems,
        status: "draft",
      })
      .select("id")
      .single<{ id: string }>();
    if (error || !data)
      return NextResponse.json(
        { error: "추가 질문을 만들지 못했습니다." },
        { status: 400 },
      );

    await service.from("case_activity_log").insert({
      case_id: caseId.data,
      actor_type: "admin",
      actor_id: admin.id,
      action: "follow_up_created",
      metadata: { follow_up_id: data.id },
    });
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestSecurityError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "추가 질문을 만들지 못했습니다." },
      { status: 400 },
    );
  }
}
