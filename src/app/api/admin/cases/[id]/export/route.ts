import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentAdmin } from "@/lib/admin-auth";
import {
  buildCaseCsvExport,
  buildCaseJsonExport,
  type CaseExportType,
} from "@/lib/case-export";
import { getCaseWorkspace } from "@/lib/case-workspace";

const exportTypeSchema = z.enum([
  "json",
  "case",
  "history",
  "profiles",
  "evidence",
]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  const caseId = z.uuid().safeParse((await context.params).id);
  const type = exportTypeSchema.safeParse(
    request.nextUrl.searchParams.get("type"),
  );
  if (!caseId.success || !type.success)
    return NextResponse.json(
      { error: "내보내기 요청을 확인해주세요." },
      { status: 400 },
    );
  const workspace = await getCaseWorkspace(caseId.data);
  if (!workspace)
    return NextResponse.json(
      { error: "사건을 찾을 수 없습니다." },
      { status: 404 },
    );

  const filename = safeFilename(`${workspace.case.case_code}-${type.data}`);
  if (type.data === "json") {
    return new NextResponse(
      JSON.stringify(buildCaseJsonExport(workspace), null, 2),
      {
        headers: downloadHeaders(
          "application/json; charset=utf-8",
          `${filename}.json`,
        ),
      },
    );
  }
  return new NextResponse(
    buildCaseCsvExport(workspace, type.data as Exclude<CaseExportType, "json">),
    {
      headers: downloadHeaders("text/csv; charset=utf-8", `${filename}.csv`),
    },
  );
}

function downloadHeaders(contentType: string, filename: string) {
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  };
}

function safeFilename(value: string) {
  return value.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 120);
}
