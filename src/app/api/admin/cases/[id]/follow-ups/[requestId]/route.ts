import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentAdmin } from "@/lib/admin-auth";
import {
  canTransitionFollowUpStatus,
  type FollowUpStatus,
} from "@/lib/follow-up-status";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { assertContentLength, assertJsonRequest } from "@/lib/route-input";
import { updateFollowUpSchema } from "@/lib/schemas/admin-workspace";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; requestId: string }> },
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
    const params = await context.params;
    const caseId = z.uuid().safeParse(params.id);
    const requestId = z.uuid().safeParse(params.requestId);
    const body = updateFollowUpSchema.safeParse(await request.json());
    if (!caseId.success || !requestId.success || !body.success)
      return NextResponse.json(
        { error: "추가 질문 상태를 확인해주세요." },
        { status: 400 },
      );

    const service = createServiceRoleClient();
    const { data: current } = await service
      .from("follow_up_requests")
      .select("status")
      .eq("case_id", caseId.data)
      .eq("id", requestId.data)
      .maybeSingle<{ status: FollowUpStatus }>();
    if (!current)
      return NextResponse.json(
        { error: "추가 질문을 찾을 수 없습니다." },
        { status: 404 },
      );
    if (!canTransitionFollowUpStatus(current.status, body.data.status))
      return NextResponse.json(
        { error: "현재 단계에서 선택할 수 없는 상태입니다." },
        { status: 409 },
      );

    const responseRecorded = Boolean(body.data.customerResponse);
    const { data: updated, error } = await service
      .from("follow_up_requests")
      .update({
        status: body.data.status,
        customer_response: body.data.customerResponse || null,
        responded_at: responseRecorded ? new Date().toISOString() : null,
      })
      .eq("case_id", caseId.data)
      .eq("id", requestId.data)
      .eq("status", current.status)
      .select("id")
      .maybeSingle<{ id: string }>();
    if (error)
      return NextResponse.json(
        { error: "추가 질문 상태를 저장하지 못했습니다." },
        { status: 400 },
      );
    if (!updated)
      return NextResponse.json(
        {
          error:
            "다른 화면에서 상태가 변경됐습니다. 새로고침 후 다시 시도해주세요.",
        },
        { status: 409 },
      );

    await service.from("case_activity_log").insert({
      case_id: caseId.data,
      actor_type: "admin",
      actor_id: admin.id,
      action: "follow_up_status_changed",
      metadata: {
        follow_up_id: requestId.data,
        from: current.status,
        to: body.data.status,
      },
    });
    return NextResponse.json({ updated: true });
  } catch (error) {
    if (error instanceof RequestSecurityError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "추가 질문 상태를 저장하지 못했습니다." },
      { status: 400 },
    );
  }
}
