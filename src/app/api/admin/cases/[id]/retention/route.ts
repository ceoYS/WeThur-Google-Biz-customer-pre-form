import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentAdmin } from "@/lib/admin-auth";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { assertContentLength, assertJsonRequest } from "@/lib/route-input";
import { createServiceRoleClient } from "@/lib/supabase/service";

const retentionSchema = z.object({
  reviewDate: z.union([z.literal(""), z.iso.date()]),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    assertJsonRequest(request);
    assertContentLength(request, 4 * 1024);
    const admin = await getCurrentAdmin();
    if (!admin)
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 },
      );
    const caseId = z.uuid().safeParse((await context.params).id);
    const body = retentionSchema.safeParse(await request.json());
    if (!caseId.success || !body.success)
      return NextResponse.json(
        { error: "보관 검토일을 확인해주세요." },
        { status: 400 },
      );

    const reviewAt = body.data.reviewDate
      ? `${body.data.reviewDate}T00:00:00.000Z`
      : null;
    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("cases")
      .update({ retention_review_at: reviewAt })
      .eq("id", caseId.data)
      .select("id")
      .maybeSingle();
    if (error || !data)
      return NextResponse.json(
        { error: "보관 검토일을 저장하지 못했습니다." },
        { status: 404 },
      );

    await service.from("case_activity_log").insert({
      case_id: caseId.data,
      actor_type: "admin",
      actor_id: admin.id,
      action: "retention_review_scheduled",
      metadata: { review_date: body.data.reviewDate || null },
    });
    return NextResponse.json({ reviewDate: body.data.reviewDate });
  } catch (error) {
    if (error instanceof RequestSecurityError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "보관 검토일을 저장하지 못했습니다." },
      { status: 400 },
    );
  }
}
