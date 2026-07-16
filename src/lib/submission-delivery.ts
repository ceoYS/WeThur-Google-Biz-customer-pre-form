import "server-only";

import { createHmac } from "node:crypto";

import { getServerEnvironment } from "@/lib/env.server";
import { createServiceRoleClient } from "@/lib/supabase/service";

export type SubmissionSummary = {
  caseId: string;
  caseCode: string;
  businessName: string;
  submittedAt: string;
};

export async function deliverSubmissionIntegrations(
  summary: SubmissionSummary,
) {
  await Promise.all([
    deliverEmail(summary).catch(() => undefined),
    deliverSheetsSummary(summary).catch(() => undefined),
  ]);
}

async function deliverEmail(summary: SubmissionSummary) {
  const env = getServerEnvironment();
  if (
    !env.EMAIL_PROVIDER_API_KEY ||
    !env.SUBMISSION_NOTIFICATION_EMAIL ||
    !env.EMAIL_FROM
  ) {
    await recordDelivery(summary.caseId, "email_notification", "disabled", 0);
    return;
  }

  const adminUrl = `${env.APP_URL.replace(/\/$/, "")}/admin/cases/${summary.caseId}`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.EMAIL_PROVIDER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [env.SUBMISSION_NOTIFICATION_EMAIL],
        subject: `[WeThru] ${summary.caseCode} 신규 접수`,
        html: `<p>새 고객 제출이 도착했습니다.</p><dl><dt>사건 코드</dt><dd>${escapeHtml(summary.caseCode)}</dd><dt>사업장</dt><dd>${escapeHtml(summary.businessName)}</dd><dt>제출 시각</dt><dd>${escapeHtml(summary.submittedAt)}</dd></dl><p><a href="${escapeHtml(adminUrl)}">관리자 사건 열기</a></p>`,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`email_http_${response.status}`);
    await recordDelivery(summary.caseId, "email_notification", "sent", 1);
  } catch (error) {
    await recordDelivery(
      summary.caseId,
      "email_notification",
      "failed",
      1,
      errorCode(error, "email_failed"),
    );
  }
}

async function deliverSheetsSummary(summary: SubmissionSummary) {
  const env = getServerEnvironment();
  if (!env.GOOGLE_SHEETS_WEBHOOK_URL || !env.GOOGLE_SHEETS_WEBHOOK_SECRET) {
    await recordDelivery(
      summary.caseId,
      "google_sheets_summary",
      "disabled",
      0,
    );
    return;
  }
  const payload = {
    caseCode: summary.caseCode,
    businessName: summary.businessName,
    submittedAt: summary.submittedAt,
    adminCaseUrl: `${env.APP_URL.replace(/\/$/, "")}/admin/cases/${summary.caseId}`,
  };
  const serialized = JSON.stringify(payload);
  const signature = createHmac("sha256", env.GOOGLE_SHEETS_WEBHOOK_SECRET)
    .update(serialized)
    .digest("hex");
  try {
    const response = await fetch(env.GOOGLE_SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload, signature }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`sheets_http_${response.status}`);
    await recordDelivery(summary.caseId, "google_sheets_summary", "sent", 1);
  } catch (error) {
    await recordDelivery(
      summary.caseId,
      "google_sheets_summary",
      "failed",
      1,
      errorCode(error, "sheets_failed"),
    );
  }
}

async function recordDelivery(
  caseId: string,
  deliveryType: "email_notification" | "google_sheets_summary",
  status: "sent" | "failed" | "disabled",
  attemptCount: number,
  lastErrorCode?: string,
) {
  await createServiceRoleClient()
    .from("outbound_delivery_log")
    .insert({
      case_id: caseId,
      delivery_type: deliveryType,
      status,
      attempt_count: attemptCount,
      last_error_code: lastErrorCode ?? null,
    });
}

function errorCode(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const match = /^(email|sheets)_http_\d{3}$/.exec(error.message);
  return match ? match[0] : fallback;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] ?? character,
  );
}
