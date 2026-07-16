import { describe, expect, it } from "vitest";

import { verifyWebhookSignature } from "@/lib/webhook-signature";
import { createHmac } from "node:crypto";

describe("submission delivery signature", () => {
  it("accepts only the matching payload signature", () => {
    const payload = JSON.stringify({ caseCode: "WTH-TEST" });
    const signature = createHmac("sha256", "test-secret")
      .update(payload)
      .digest("hex");
    expect(verifyWebhookSignature(payload, signature, "test-secret")).toBe(
      true,
    );
    expect(
      verifyWebhookSignature(`${payload}x`, signature, "test-secret"),
    ).toBe(false);
    expect(verifyWebhookSignature(payload, "not-hex", "test-secret")).toBe(
      false,
    );
  });
});
