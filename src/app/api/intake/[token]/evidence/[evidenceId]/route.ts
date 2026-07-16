import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { loadPublicIntakeCase } from "@/lib/intake-access";
import {
  assertSameOrigin,
  consumeRateLimit,
  RequestSecurityError,
} from "@/lib/request-security";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { intakeTokenSchema } from "@/lib/tokens";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ token: string; evidenceId: string }> },
) {
  try {
    assertSameOrigin(request);
    const params = await context.params;
    const tokenResult = intakeTokenSchema.safeParse(params.token);
    const evidenceIdResult = z.uuid().safeParse(params.evidenceId);
    if (!tokenResult.success || !evidenceIdResult.success)
      return NextResponse.json(
        { error: "자료를 찾을 수 없습니다." },
        { status: 404 },
      );

    const allowed = await consumeRateLimit({
      request,
      action: "customer_delete_evidence",
      caseToken: tokenResult.data,
      limit: 30,
      windowSeconds: 3_600,
    });
    if (!allowed)
      return NextResponse.json(
        { error: "삭제 요청이 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 },
      );

    const intakeCase = await loadPublicIntakeCase(tokenResult.data);
    if (!intakeCase)
      return NextResponse.json(
        { error: "고객 링크를 확인할 수 없습니다." },
        { status: 404 },
      );
    if (intakeCase.intakeStatus === "submitted")
      return NextResponse.json(
        { error: "제출 후에는 자료를 삭제할 수 없습니다." },
        { status: 409 },
      );

    const service = createServiceRoleClient();
    const { data: evidence } = await service
      .from("case_evidence")
      .select("id, storage_path")
      .eq("id", evidenceIdResult.data)
      .eq("case_id", intakeCase.id)
      .maybeSingle<{ id: string; storage_path: string }>();
    if (!evidence)
      return NextResponse.json(
        { error: "자료를 찾을 수 없습니다." },
        { status: 404 },
      );

    const { error: deleteError } = await service
      .from("case_evidence")
      .delete()
      .eq("id", evidence.id)
      .eq("case_id", intakeCase.id);
    if (deleteError)
      return NextResponse.json(
        { error: "자료를 삭제하지 못했습니다." },
        { status: 400 },
      );
    const { error: storageError } = await service.storage
      .from("case-evidence")
      .remove([evidence.storage_path]);

    await service.from("case_activity_log").insert({
      case_id: intakeCase.id,
      actor_type: "customer",
      action: "evidence_deleted_before_submission",
      metadata: {
        evidence_id: evidence.id,
        storage_cleanup_pending: Boolean(storageError),
      },
    });
    return NextResponse.json(
      { deleted: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof RequestSecurityError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "자료를 삭제하지 못했습니다." },
      { status: 400 },
    );
  }
}
