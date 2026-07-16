import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentAdmin } from "@/lib/admin-auth";
import { generateAndStoreDiagnosis } from "@/lib/diagnosis-service";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { assertContentLength, assertJsonRequest } from "@/lib/route-input";
import { diagnosisDecisionSchema } from "@/lib/schemas/admin-workspace";
import { intakePayloadSchema } from "@/lib/schemas/intake";
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
    const caseId = z.uuid().safeParse((await context.params).id);
    if (!caseId.success)
      return NextResponse.json(
        { error: "사건을 확인해주세요." },
        { status: 400 },
      );

    const service = createServiceRoleClient();
    const { data } = await service
      .from("case_intake_responses")
      .select("final_payload")
      .eq("case_id", caseId.data)
      .maybeSingle<{ final_payload: unknown }>();
    const payload = intakePayloadSchema.safeParse(data?.final_payload);
    if (!payload.success)
      return NextResponse.json(
        { error: "최종 제출 데이터가 없어 진단할 수 없습니다." },
        { status: 409 },
      );

    const diagnosis = await generateAndStoreDiagnosis(
      caseId.data,
      payload.data,
    );
    await service.from("case_activity_log").insert({
      case_id: caseId.data,
      actor_type: "admin",
      actor_id: admin.id,
      action: "diagnosis_regenerated",
      metadata: { engine_version: diagnosis.engineVersion },
    });
    return NextResponse.json({
      generated: true,
      engineVersion: diagnosis.engineVersion,
    });
  } catch (error) {
    if (error instanceof RequestSecurityError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "진단을 생성하지 못했습니다." },
      { status: 400 },
    );
  }
}

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
    const caseId = z.uuid().safeParse((await context.params).id);
    const body = diagnosisDecisionSchema.safeParse(await request.json());
    if (!caseId.success || !body.success)
      return NextResponse.json(
        { error: "결정 내용을 확인해주세요." },
        { status: 400 },
      );

    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("case_diagnosis")
      .update({
        admin_decision_path: body.data.adminDecisionPath,
        admin_conclusion: body.data.adminConclusion || null,
        last_reviewed_by: admin.id,
      })
      .eq("case_id", caseId.data)
      .select("case_id")
      .maybeSingle();
    if (error || !data)
      return NextResponse.json(
        { error: "먼저 진단을 생성해주세요." },
        { status: 409 },
      );

    await service.from("case_activity_log").insert({
      case_id: caseId.data,
      actor_type: "admin",
      actor_id: admin.id,
      action: "diagnosis_decision_updated",
      metadata: { path: body.data.adminDecisionPath },
    });
    return NextResponse.json({ updated: true });
  } catch (error) {
    if (error instanceof RequestSecurityError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "결정을 저장하지 못했습니다." },
      { status: 400 },
    );
  }
}
