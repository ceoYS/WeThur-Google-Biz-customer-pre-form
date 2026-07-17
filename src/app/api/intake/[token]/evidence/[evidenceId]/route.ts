import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getServerEnvironment } from "@/lib/env.server";
import {
  assertSameOrigin,
  consumeRateLimit,
  RequestSecurityError,
} from "@/lib/request-security";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { hashIntakeToken, intakeTokenSchema } from "@/lib/tokens";

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

    const service = createServiceRoleClient();
    const { data: evidenceData, error: deleteError } = await service.rpc(
      "delete_customer_case_evidence",
      {
        p_token_hash: hashIntakeToken(
          tokenResult.data,
          getServerEnvironment().TOKEN_HASH_SECRET,
        ),
        p_evidence_id: evidenceIdResult.data,
      },
    );
    if (deleteError?.message.includes("case_not_writable"))
      return NextResponse.json(
        { error: "제출 후에는 자료를 삭제할 수 없습니다." },
        { status: 409 },
      );
    if (deleteError?.message.includes("invalid_token"))
      return NextResponse.json(
        { error: "고객 링크를 확인할 수 없습니다." },
        { status: 404 },
      );
    const evidence = evidenceData as EvidenceDeletionResult | null;
    if (deleteError || !evidence)
      return NextResponse.json(
        { error: "자료를 찾을 수 없습니다." },
        { status: 404 },
      );

    let storageError: unknown = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = await service.storage
        .from("case-evidence")
        .remove([evidence.storage_path]);
      storageError = result.error;
      if (!storageError) break;
    }

    await service.from("case_activity_log").insert({
      case_id: evidence.case_id,
      actor_type: "customer",
      action: "evidence_deleted_before_submission",
      metadata: {
        evidence_id: evidence.id,
        storage_cleanup_pending: Boolean(storageError),
        ...(storageError ? { storage_path: evidence.storage_path } : {}),
      },
    });
    return NextResponse.json(
      { deleted: true, cleanupPending: Boolean(storageError) },
      {
        status: storageError ? 202 : 200,
        headers: { "Cache-Control": "no-store" },
      },
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

type EvidenceDeletionResult = {
  id: string;
  case_id: string;
  storage_path: string;
};
