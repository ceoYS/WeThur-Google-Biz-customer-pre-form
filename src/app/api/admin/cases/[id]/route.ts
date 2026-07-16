import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentAdmin } from "@/lib/admin-auth";
import {
  canTransitionCaseStatus,
  caseStatusLabels,
  type CaseStatus,
} from "@/lib/case-status";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { assertContentLength, assertJsonRequest } from "@/lib/route-input";
import { createServiceRoleClient } from "@/lib/supabase/service";

const updateStatusSchema = z.object({
  status: z.enum(
    Object.keys(caseStatusLabels) as [CaseStatus, ...CaseStatus[]],
  ),
});

export async function PATCH(
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
    const idResult = z.uuid().safeParse((await context.params).id);
    const bodyResult = updateStatusSchema.safeParse(await request.json());
    if (!idResult.success || !bodyResult.success)
      return NextResponse.json(
        { error: "요청을 확인해주세요." },
        { status: 400 },
      );

    const service = createServiceRoleClient();
    const { data: current } = await service
      .from("cases")
      .select("status")
      .eq("id", idResult.data)
      .maybeSingle<{ status: CaseStatus }>();
    if (!current)
      return NextResponse.json(
        { error: "사건을 찾을 수 없습니다." },
        { status: 404 },
      );
    if (!canTransitionCaseStatus(current.status, bodyResult.data.status))
      return NextResponse.json(
        { error: "현재 단계에서 선택할 수 없는 상태입니다." },
        { status: 409 },
      );

    const updates: { status: CaseStatus; completed_at?: string | null } = {
      status: bodyResult.data.status,
    };
    if (bodyResult.data.status === "completed")
      updates.completed_at = new Date().toISOString();
    else if (current.status === "completed") updates.completed_at = null;
    const { error } = await service
      .from("cases")
      .update(updates)
      .eq("id", idResult.data);
    if (error)
      return NextResponse.json(
        { error: "상태를 변경하지 못했습니다." },
        { status: 400 },
      );

    await service.from("case_activity_log").insert({
      case_id: idResult.data,
      actor_type: "admin",
      actor_id: admin.id,
      action: "case_status_changed",
      metadata: { from: current.status, to: bodyResult.data.status },
    });
    return NextResponse.json({ status: bodyResult.data.status });
  } catch (error) {
    if (error instanceof RequestSecurityError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "상태를 변경하지 못했습니다." },
      { status: 400 },
    );
  }
}
