import { describe, it, expect } from "vitest";
import crypto from "node:crypto";

// lib/razorpay reads its keys at module load, so the env has to be in place
// before the import is evaluated — hence the dynamic import below.
const KEY_ID = "rzp_test_fake";
const KEY_SECRET = "test_key_secret";
const WEBHOOK_SECRET = "test_webhook_secret";

process.env.RAZORPAY_KEY_ID = KEY_ID;
process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

const { verifyPaymentSignature, verifyWebhookSignature, isRazorpayConfigured } = await import(
  "@/lib/razorpay"
);

const hmac = (secret: string, payload: string) =>
  crypto.createHmac("sha256", secret).update(payload).digest("hex");

describe("isRazorpayConfigured", () => {
  it("is true when both key id and secret are present", () => {
    expect(isRazorpayConfigured).toBe(true);
  });
});

describe("verifyPaymentSignature", () => {
  const orderId = "order_ABC123";
  const paymentId = "pay_XYZ789";
  // This is exactly what Razorpay's checkout handler sends back.
  const valid = hmac(KEY_SECRET, `${orderId}|${paymentId}`);

  it("accepts a signature derived from order_id|payment_id", () => {
    expect(verifyPaymentSignature(orderId, paymentId, valid)).toBe(true);
  });

  it("rejects a tampered signature of the same length", () => {
    const tampered = valid.slice(0, -1) + (valid.endsWith("a") ? "b" : "a");
    expect(verifyPaymentSignature(orderId, paymentId, tampered)).toBe(false);
  });

  it("rejects a signature valid for a DIFFERENT payment", () => {
    // The attack this blocks: replaying your own payment's signature to settle
    // someone else's order.
    const other = hmac(KEY_SECRET, `${orderId}|pay_ATTACKER`);
    expect(verifyPaymentSignature(orderId, paymentId, other)).toBe(false);
  });

  it("rejects a signature of the wrong length without throwing", () => {
    // timingSafeEqual throws on length mismatch — safeEqual must length-check first.
    expect(() => verifyPaymentSignature(orderId, paymentId, "short")).not.toThrow();
    expect(verifyPaymentSignature(orderId, paymentId, "short")).toBe(false);
  });

  it("rejects an empty signature", () => {
    expect(verifyPaymentSignature(orderId, paymentId, "")).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ event: "payment.captured", payload: {} });

  it("accepts a signature over the exact raw body", () => {
    expect(verifyWebhookSignature(body, hmac(WEBHOOK_SECRET, body))).toBe(true);
  });

  it("rejects when the body was modified after signing", () => {
    const signature = hmac(WEBHOOK_SECRET, body);
    const altered = JSON.stringify({ event: "order.paid", payload: {} });
    expect(verifyWebhookSignature(altered, signature)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    expect(verifyWebhookSignature(body, null)).toBe(false);
  });

  it("rejects a signature made with the payment key instead of the webhook secret", () => {
    expect(verifyWebhookSignature(body, hmac(KEY_SECRET, body))).toBe(false);
  });
});
