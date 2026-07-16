import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentAdmin } from "@/lib/admin-auth";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { assertContentLength, assertJsonRequest } from "@/lib/route-input";
import { reorderHistorySchema } from "@/lib/schemas/admin-workspace";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    assertJsonRequest(request);
    assertContentLength(request, 16 * 1024);
    const admin = await getCurrentAdmin();
    if (!admin)
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 },
      );
    const caseId = z.uuid().safeParse((await context.params).id);
    const body = reorderHistorySchema.safeParse(await request.json());
    if (!caseId.success || !body.success)
      return NextResponse.json(
        { error: "순서를 확인해주세요." },
        { status: 400 },
      );

    const service = createServiceRoleClient();
    const { error } = await service.rpc("reorder_case_history_events", {
      p_case_id: caseId.data,
      p_event_ids: body.data.eventIds,
    });
    if (error)
      return NextResponse.json(
        { error: "순서를 변경하지 못했습니다." },
        { status: 409 },
      );

    await service.from("case_activity_log").insert({
      case_id: caseId.data,
      actor_type: "admin",
      actor_id: admin.id,
      action: "history_events_reordered",
      metadata: { event_count: body.data.eventIds.length },
    });
    return NextResponse.json({ reordered: true });
  } catch (error) {
    if (error instanceof RequestSecurityError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "순서를 변경하지 못했습니다." },
      { status: 400 },
    );
  }
}
