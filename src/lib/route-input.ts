import "server-only";

import type { NextRequest } from "next/server";

import { RequestSecurityError } from "@/lib/request-security";

export function assertJsonRequest(request: NextRequest): void {
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim();
  if (contentType !== "application/json") {
    throw new RequestSecurityError("지원하지 않는 요청 형식입니다.", 415);
  }
}

export function assertMultipartRequest(request: NextRequest): void {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    throw new RequestSecurityError("지원하지 않는 파일 요청 형식입니다.", 415);
  }
}

export function assertContentLength(
  request: NextRequest,
  maximumBytes: number,
): void {
  const rawLength = request.headers.get("content-length");
  if (!rawLength) return;
  const length = Number(rawLength);
  if (!Number.isFinite(length) || length < 0 || length > maximumBytes) {
    throw new RequestSecurityError("요청 용량이 너무 큽니다.", 413);
  }
}
