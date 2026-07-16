import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import {
  FileValidationError,
  validateEvidenceFile,
} from "@/lib/file-validation";
import { loadPublicIntakeCase } from "@/lib/intake-access";
import {
  assertSameOrigin,
  consumeRateLimit,
  RequestSecurityError,
} from "@/lib/request-security";
import { assertContentLength, assertMultipartRequest } from "@/lib/route-input";
import { evidenceUploadMetadataSchema } from "@/lib/schemas/intake";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { intakeTokenSchema } from "@/lib/tokens";

const MAX_MULTIPART_BYTES = 16 * 1024 * 1024;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  let uploadedPath: string | null = null;
  try {
    assertSameOrigin(request);
    assertMultipartRequest(request);
    assertContentLength(request, MAX_MULTIPART_BYTES);
    const tokenResult = intakeTokenSchema.safeParse(
      (await context.params).token,
    );
    if (!tokenResult.success) {
      return NextResponse.json(
        { error: "유효하지 않은 고객 링크입니다." },
        { status: 404 },
      );
    }
    const allowed = await consumeRateLimit({
      request,
      action: "customer_upload_evidence",
      caseToken: tokenResult.data,
      limit: 30,
      windowSeconds: 3_600,
    });
    if (!allowed)
      return NextResponse.json(
        { error: "업로드 요청이 많습니다. 잠시 후 다시 시도해주세요." },
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
        { error: "제출 후에는 자료를 변경할 수 없습니다." },
        { status: 409 },
      );

    const formData = await request.formData();
    const fileValue = formData.get("file");
    if (!(fileValue instanceof File))
      return NextResponse.json(
        { error: "파일을 선택해주세요." },
        { status: 400 },
      );
    const metadataResult = evidenceUploadMetadataSchema.safeParse({
      evidenceCategory: formData.get("evidenceCategory"),
      customerDescription: formData.get("customerDescription") ?? "",
      linkType: formData.get("linkType") || undefined,
      linkClientId: formData.get("linkClientId") || undefined,
    });
    if (!metadataResult.success)
      return NextResponse.json(
        { error: "자료 분류와 연결 항목을 확인해주세요." },
        { status: 400 },
      );

    const firstBytes = new Uint8Array(
      await fileValue.slice(0, 16).arrayBuffer(),
    );
    const validated = validateEvidenceFile({
      name: fileValue.name,
      declaredMime: fileValue.type,
      sizeBytes: fileValue.size,
      firstBytes,
    });

    const service = createServiceRoleClient();
    const { count } = await service
      .from("case_evidence")
      .select("id", { count: "exact", head: true })
      .eq("case_id", intakeCase.id);
    if ((count ?? 0) >= 15)
      return NextResponse.json(
        { error: "자료는 최대 15개까지 업로드할 수 있습니다." },
        { status: 400 },
      );

    uploadedPath = `cases/${intakeCase.id}/${randomUUID()}-${validated.storageFilename}`;
    const bytes = Buffer.from(await fileValue.arrayBuffer());
    const { error: storageError } = await service.storage
      .from("case-evidence")
      .upload(uploadedPath, bytes, {
        contentType: validated.mimeType,
        upsert: false,
      });
    if (storageError)
      return NextResponse.json(
        { error: "파일을 안전하게 저장하지 못했습니다." },
        { status: 400 },
      );

    const { data: evidence, error: insertError } = await service
      .from("case_evidence")
      .insert({
        case_id: intakeCase.id,
        evidence_category: metadataResult.data.evidenceCategory,
        storage_path: uploadedPath,
        original_filename: validated.originalFilename,
        mime_type: validated.mimeType,
        size_bytes: validated.sizeBytes,
        customer_description: metadataResult.data.customerDescription || null,
        uploaded_by_type: "customer",
        customer_link_type: metadataResult.data.linkType ?? null,
        customer_link_client_id: metadataResult.data.linkClientId ?? null,
      })
      .select(
        "id, evidence_category, original_filename, size_bytes, customer_description, customer_link_type, customer_link_client_id",
      )
      .single();
    if (insertError || !evidence) {
      await service.storage.from("case-evidence").remove([uploadedPath]);
      uploadedPath = null;
      return NextResponse.json(
        { error: "자료 정보를 저장하지 못했습니다." },
        { status: 400 },
      );
    }

    await service.from("case_activity_log").insert({
      case_id: intakeCase.id,
      actor_type: "customer",
      action: "evidence_uploaded",
      metadata: {
        evidence_id: evidence.id,
        category: evidence.evidence_category,
      },
    });

    return NextResponse.json(
      {
        evidence: {
          id: evidence.id,
          category: evidence.evidence_category,
          originalFilename: evidence.original_filename,
          sizeBytes: evidence.size_bytes,
          customerDescription: evidence.customer_description,
          linkType: evidence.customer_link_type,
          linkClientId: evidence.customer_link_client_id,
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof RequestSecurityError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof FileValidationError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    if (uploadedPath)
      await createServiceRoleClient()
        .storage.from("case-evidence")
        .remove([uploadedPath]);
    return NextResponse.json(
      { error: "파일을 업로드하지 못했습니다." },
      { status: 400 },
    );
  }
}
