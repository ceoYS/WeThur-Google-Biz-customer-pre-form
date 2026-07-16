import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentAdmin } from "@/lib/admin-auth";
import { getServerEnvironment } from "@/lib/env.server";
import {
  assertSameOrigin,
  consumeRateLimit,
  RequestSecurityError,
} from "@/lib/request-security";
import { tokenMutationSchema } from "@/lib/schemas/case";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  buildIntakeUrl,
  generateIntakeToken,
  hashIntakeToken,
} from "@/lib/tokens";

const caseIdSchema = z.uuid();

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

    const idResult = caseIdSchema.safeParse((await context.params).id);
    const bodyResult = tokenMutationSchema.safeParse(await request.json());
    if (!idResult.success || !bodyResult.success) {
      return NextResponse.json(
        { error: "요청을 확인해주세요." },
        { status: 400 },
      );
    }

    const allowed = await consumeRateLimit({
      request,
      action: "admin_case_token",
      caseToken: idResult.data,
      limit: 20,
      windowSeconds: 3_600,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "잠시 후 다시 시도해주세요." },
        { status: 429 },
      );
    }

    const service = createServiceRoleClient();
    if (bodyResult.data.action === "revoke") {
      const { data, error } = await service
        .from("cases")
        .update({ token_status: "revoked" })
        .eq("id", idResult.data)
        .select("id")
        .maybeSingle();
      if (error || !data)
        return NextResponse.json(
          { error: "사건을 찾을 수 없습니다." },
          { status: 404 },
        );

      await service.from("case_activity_log").insert({
        case_id: idResult.data,
        actor_type: "admin",
        actor_id: admin.id,
        action: "intake_token_revoked",
        metadata: {},
      });
      return NextResponse.json(
        { status: "revoked" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const environment = getServerEnvironment();
    const token = generateIntakeToken();
    const tokenHash = hashIntakeToken(token, environment.TOKEN_HASH_SECRET);
    const { data, error } = await service
      .from("cases")
      .update({ token_hash: tokenHash, token_status: "active" })
      .eq("id", idResult.data)
      .select("id")
      .maybeSingle();
    if (error || !data)
      return NextResponse.json(
        { error: "사건을 찾을 수 없습니다." },
        { status: 404 },
      );

    await service.from("case_activity_log").insert({
      case_id: idResult.data,
      actor_type: "admin",
      actor_id: admin.id,
      action: "intake_token_regenerated",
      metadata: {},
    });

    return NextResponse.json(
      {
        status: "active",
        intakeUrl: buildIntakeUrl(environment.APP_URL, token),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof RequestSecurityError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "요청을 처리하지 못했습니다." },
      { status: 400 },
    );
  }
}
