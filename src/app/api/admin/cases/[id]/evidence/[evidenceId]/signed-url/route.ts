import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentAdmin } from "@/lib/admin-auth";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; evidenceId: string }> },
) {
  try {
    assertSameOrigin(request);
    const admin = await getCurrentAdmin();
    if (!admin)
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 },
      );
    const params = await context.params;
    const caseId = z.uuid().safeParse(params.id);
    const evidenceId = z.uuid().safeParse(params.evidenceId);
    if (!caseId.success || !evidenceId.success)
      return NextResponse.json(
        { error: "자료를 찾을 수 없습니다." },
        { status: 404 },
      );

    const service = createServiceRoleClient();
    const { data: evidence } = await service
      .from("case_evidence")
      .select("id, storage_path")
      .eq("id", evidenceId.data)
      .eq("case_id", caseId.data)
      .maybeSingle<{ id: string; storage_path: string }>();
    if (!evidence)
      return NextResponse.json(
        { error: "자료를 찾을 수 없습니다." },
        { status: 404 },
      );
    const { data, error } = await service.storage
      .from("case-evidence")
      .createSignedUrl(evidence.storage_path, 60, { download: false });
    if (error || !data?.signedUrl)
      return NextResponse.json(
        { error: "자료를 열 수 없습니다." },
        { status: 400 },
      );

    await service.from("case_activity_log").insert({
      case_id: caseId.data,
      actor_type: "admin",
      actor_id: admin.id,
      action: "evidence_accessed",
      metadata: { evidence_id: evidence.id },
    });
    return NextResponse.json(
      { signedUrl: data.signedUrl, expiresIn: 60 },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof RequestSecurityError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "자료를 열 수 없습니다." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; evidenceId: string }> },
) {
  try {
    assertSameOrigin(request);
    const admin = await getCurrentAdmin();
    if (!admin)
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 },
      );
    const params = await context.params;
    const caseId = z.uuid().safeParse(params.id);
    const evidenceId = z.uuid().safeParse(params.evidenceId);
    if (!caseId.success || !evidenceId.success)
      return NextResponse.json(
        { error: "자료를 찾을 수 없습니다." },
        { status: 404 },
      );

    const service = createServiceRoleClient();
    const { data: evidence } = await service
      .from("case_evidence")
      .select("id, storage_path")
      .eq("id", evidenceId.data)
      .eq("case_id", caseId.data)
      .maybeSingle<{ id: string; storage_path: string }>();
    if (!evidence)
      return NextResponse.json(
        { error: "자료를 찾을 수 없습니다." },
        { status: 404 },
      );

    const { error: storageError } = await service.storage
      .from("case-evidence")
      .remove([evidence.storage_path]);
    if (storageError)
      return NextResponse.json(
        { error: "비공개 파일을 삭제하지 못했습니다." },
        { status: 400 },
      );
    const { error: metadataError } = await service
      .from("case_evidence")
      .delete()
      .eq("id", evidence.id)
      .eq("case_id", caseId.data);
    if (metadataError)
      return NextResponse.json(
        { error: "파일 기록을 정리하지 못했습니다." },
        { status: 400 },
      );

    await service.from("case_activity_log").insert({
      case_id: caseId.data,
      actor_type: "admin",
      actor_id: admin.id,
      action: "evidence_deleted_by_admin",
      metadata: { evidence_id: evidence.id },
    });
    return NextResponse.json({ deleted: true });
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
