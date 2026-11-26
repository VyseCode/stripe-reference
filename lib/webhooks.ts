import { createHmac, timingSafeEqual } from "node:crypto";

export function webhookSecret(): string {
  return process.env.WEBHOOK_SECRET || "whsec_local_reference_secret_3221";
}

export function signWebhookBody(rawBody: string, timestamp: string, secret = webhookSecret()): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

export function verifyWebhookSignature(
  rawBody: string,
  header: string | null,
  secret = webhookSecret(),
): boolean {
  if (!header) return false;
  const match = /^t=(\d+),v1=([a-f0-9]+)$/i.exec(header.trim());
  if (!match) return false;

  const timestamp = Number(match[1]);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > 300) return false;

  const expected = signWebhookBody(rawBody, match[1], secret);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(match[2], "utf8");
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}
