import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentAdmin } from "@/lib/admin-auth";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { assertContentLength, assertJsonRequest } from "@/lib/route-input";
import { factReviewSchema } from "@/lib/schemas/admin-workspace";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; factId: string }> },
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
    const params = await context.params;
    const caseId = z.uuid().safeParse(params.id);
    const factId = z.uuid().safeParse(params.factId);
    const body = factReviewSchema.safeParse(await request.json());
    if (!caseId.success || !factId.success || !body.success)
      return NextResponse.json(
        { error: "검토 내용을 확인해주세요." },
        { status: 400 },
      );

    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("case_fact_items")
      .update({
        verification_status: body.data.verificationStatus,
        admin_note: body.data.adminNote || null,
      })
      .eq("case_id", caseId.data)
      .eq("id", factId.data)
      .select("id")
      .maybeSingle();
    if (error || !data)
      return NextResponse.json(
        { error: "사실 항목을 찾을 수 없습니다." },
        { status: 404 },
      );

    await service.from("case_activity_log").insert({
      case_id: caseId.data,
      actor_type: "admin",
      actor_id: admin.id,
      action: "fact_review_updated",
      metadata: { fact_id: factId.data, status: body.data.verificationStatus },
    });
    return NextResponse.json({ updated: true });
  } catch (error) {
    if (error instanceof RequestSecurityError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "사실 검토를 저장하지 못했습니다." },
      { status: 400 },
    );
  }
}
