import "server-only";

import { createHmac } from "node:crypto";

import type { NextRequest } from "next/server";

import { getServerEnvironment } from "@/lib/env.server";
import { isConfiguredOrigin } from "@/lib/origin-validation";
import { createServiceRoleClient } from "@/lib/supabase/service";

export class RequestSecurityError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "RequestSecurityError";
  }
}

export function assertSameOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  const appUrl = getServerEnvironment().APP_URL;

  if (!isConfiguredOrigin(origin, appUrl)) {
    throw new RequestSecurityError(
      "요청을 확인할 수 없습니다. 페이지를 새로고침해주세요.",
      403,
    );
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") {
    throw new RequestSecurityError("허용되지 않은 요청입니다.", 403);
  }
}

export function getRequestIp(request: NextRequest): string {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export function createRateLimitScope(parts: string[], secret?: string): string {
  const hashSecret = secret ?? getServerEnvironment().TOKEN_HASH_SECRET;
  return createHmac("sha256", hashSecret)
    .update(parts.join("\u001f"))
    .digest("hex");
}

export async function consumeRateLimit(options: {
  request: NextRequest;
  action: string;
  caseToken?: string;
  limit: number;
  windowSeconds: number;
}): Promise<boolean> {
  const scopeKey = createRateLimitScope([
    options.action,
    getRequestIp(options.request),
    options.caseToken ?? "none",
  ]);
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc("consume_rate_limit", {
    p_scope_key: scopeKey,
    p_window_seconds: options.windowSeconds,
    p_request_limit: options.limit,
  });

  if (error || data !== true) return false;
  return true;
}

export function assertHoneypotEmpty(value: unknown): void {
  if (typeof value === "string" && value.trim().length > 0) {
    throw new RequestSecurityError("요청을 처리할 수 없습니다.", 400);
  }
}
