import "server-only";

import { getServerEnvironment } from "@/lib/env.server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { hashIntakeToken, intakeTokenSchema } from "@/lib/tokens";

export type PublicIntakeCase = {
  id: string;
  caseCode: string;
  businessName: string;
  customerIntro: string;
  expectedCompletionMinutes: number;
  intakeStatus: "link_ready" | "draft" | "submitted" | "reopened";
};

type IntakeCaseRow = {
  id: string;
  case_code: string;
  business_name: string;
  customer_intro: string;
  expected_completion_minutes: number;
  intake_status: PublicIntakeCase["intakeStatus"];
};

export async function loadPublicIntakeCase(
  rawToken: string,
): Promise<PublicIntakeCase | null> {
  const tokenResult = intakeTokenSchema.safeParse(rawToken);
  if (!tokenResult.success) return null;

  const tokenHash = hashIntakeToken(
    tokenResult.data,
    getServerEnvironment().TOKEN_HASH_SECRET,
  );
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("cases")
    .select(
      "id, case_code, business_name, customer_intro, expected_completion_minutes, intake_status",
    )
    .eq("token_hash", tokenHash)
    .eq("token_status", "active")
    .maybeSingle<IntakeCaseRow>();

  if (error || !data) return null;

  return {
    id: data.id,
    caseCode: data.case_code,
    businessName: data.business_name,
    customerIntro: data.customer_intro,
    expectedCompletionMinutes: data.expected_completion_minutes,
    intakeStatus: data.intake_status,
  };
}
