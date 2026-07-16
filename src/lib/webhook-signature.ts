import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
) {
  const expected = createHmac("sha256", secret).update(payload).digest();
  const received = Buffer.from(signature, "hex");
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}
