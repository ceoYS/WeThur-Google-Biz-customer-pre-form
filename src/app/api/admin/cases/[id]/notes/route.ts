import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentAdmin } from "@/lib/admin-auth";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { assertContentLength, assertJsonRequest } from "@/lib/route-input";
import { createServiceRoleClient } from "@/lib/supabase/service";

const noteSchema = z.object({
  noteType: z
    .enum(["general", "review", "customer_contact", "decision", "risk"])
    .default("general"),
  content: z.string().trim().min(1).max(10_000),
});

export async function POST(
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
    const bodyResult = noteSchema.safeParse(await request.json());
    if (!idResult.success || !bodyResult.success)
      return NextResponse.json(
        { error: "메모 내용을 확인해주세요." },
        { status: 400 },
      );

    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("admin_notes")
      .insert({
        case_id: idResult.data,
        author_id: admin.id,
        note_type: bodyResult.data.noteType,
        content: bodyResult.data.content,
      })
      .select("id, note_type, content, created_at")
      .single();
    if (error || !data)
      return NextResponse.json(
        { error: "메모를 저장하지 못했습니다." },
        { status: 400 },
      );
    await service.from("case_activity_log").insert({
      case_id: idResult.data,
      actor_type: "admin",
      actor_id: admin.id,
      action: "admin_note_added",
      metadata: { note_id: data.id, note_type: data.note_type },
    });
    return NextResponse.json({ note: data }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestSecurityError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "메모를 저장하지 못했습니다." },
      { status: 400 },
    );
  }
}
