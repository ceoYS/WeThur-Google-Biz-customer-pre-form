import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentAdmin } from "@/lib/admin-auth";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const admin = await getCurrentAdmin();
    if (!admin)
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 },
      );
    const idResult = z.uuid().safeParse((await context.params).id);
    if (!idResult.success)
      return NextResponse.json(
        { error: "사건을 찾을 수 없습니다." },
        { status: 404 },
      );
    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("cases")
      .update({ intake_status: "reopened", status: "customer_writing" })
      .eq("id", idResult.data)
      .eq("intake_status", "submitted")
      .select("id, token_status")
      .maybeSingle<{ id: string; token_status: string }>();
    if (error || !data)
      return NextResponse.json(
        { error: "제출 완료 사건만 다시 열 수 있습니다." },
        { status: 409 },
      );
    await service.from("case_activity_log").insert({
      case_id: idResult.data,
      actor_type: "admin",
      actor_id: admin.id,
      action: "customer_intake_reopened",
      metadata: {},
    });
    return NextResponse.json({
      reopened: true,
      needsNewToken: data.token_status !== "active",
    });
  } catch (error) {
    if (error instanceof RequestSecurityError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "고객 작성을 다시 열지 못했습니다." },
      { status: 400 },
    );
  }
}
