import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentAdmin } from "@/lib/admin-auth";
import { historyEventAdminSchema } from "@/lib/schemas/admin-workspace";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { assertContentLength, assertJsonRequest } from "@/lib/route-input";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
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
    const caseId = z.uuid().safeParse((await context.params).id);
    const body = historyEventAdminSchema.safeParse(await request.json());
    if (!caseId.success || !body.success)
      return NextResponse.json(
        { error: "입력 내용을 확인해주세요." },
        { status: 400 },
      );

    const service = createServiceRoleClient();
    const { count } = await service
      .from("history_events")
      .select("id", { count: "exact", head: true })
      .eq("case_id", caseId.data);
    if ((count ?? 0) >= 10)
      return NextResponse.json(
        { error: "과거 이력은 최대 10개까지 추가할 수 있습니다." },
        { status: 409 },
      );

    const { data, error } = await service
      .from("history_events")
      .insert({
        case_id: caseId.data,
        sort_order: count ?? 0,
        ...emptyStringsToNull(body.data),
        customer_raw_response: {},
      })
      .select("id")
      .single<{ id: string }>();
    if (error || !data)
      return NextResponse.json(
        { error: "과거 이력을 추가하지 못했습니다." },
        { status: 400 },
      );

    await service.from("case_activity_log").insert({
      case_id: caseId.data,
      actor_type: "admin",
      actor_id: admin.id,
      action: "history_event_added",
      metadata: { history_event_id: data.id },
    });
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestSecurityError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "과거 이력을 추가하지 못했습니다." },
      { status: 400 },
    );
  }
}

function emptyStringsToNull(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      item === "" ? null : item,
    ]),
  );
}
