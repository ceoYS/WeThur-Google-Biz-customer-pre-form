import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentAdmin } from "@/lib/admin-auth";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { assertContentLength, assertJsonRequest } from "@/lib/route-input";
import { historyEventAdminSchema } from "@/lib/schemas/admin-workspace";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; eventId: string }> },
) {
  try {
    assertSameOrigin(request);
    assertJsonRequest(request);
    assertContentLength(request, 64 * 1024);
    const admin = await getCurrentAdmin();
    if (!admin)
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 },
      );
    const params = await context.params;
    const caseId = z.uuid().safeParse(params.id);
    const eventId = z.uuid().safeParse(params.eventId);
    const body = historyEventAdminSchema.safeParse(await request.json());
    if (!caseId.success || !eventId.success || !body.success)
      return NextResponse.json(
        { error: "입력 내용을 확인해주세요." },
        { status: 400 },
      );

    const updates = Object.fromEntries(
      Object.entries(body.data).map(([key, value]) => [
        key,
        value === "" ? null : value,
      ]),
    );
    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("history_events")
      .update(updates)
      .eq("case_id", caseId.data)
      .eq("id", eventId.data)
      .select("id")
      .maybeSingle<{ id: string }>();
    if (error || !data)
      return NextResponse.json(
        { error: "과거 이력을 수정하지 못했습니다." },
        { status: 404 },
      );

    await service.from("case_activity_log").insert({
      case_id: caseId.data,
      actor_type: "admin",
      actor_id: admin.id,
      action: "history_event_normalized",
      metadata: { history_event_id: eventId.data },
    });
    return NextResponse.json({ updated: true });
  } catch (error) {
    if (error instanceof RequestSecurityError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "과거 이력을 수정하지 못했습니다." },
      { status: 400 },
    );
  }
}
