import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { verifyRazorpayPaymentSignature } from "@/lib/payments/razorpay";

describe("razorpay signature", () => {
  const prev = process.env.RAZORPAY_KEY_SECRET;

  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = "test_secret";
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.RAZORPAY_KEY_SECRET;
    else process.env.RAZORPAY_KEY_SECRET = prev;
  });

  it("verifies order_id|payment_id HMAC", () => {
    const orderId = "order_abc";
    const paymentId = "pay_xyz";
    const sig = createHmac("sha256", "test_secret").update(`${orderId}|${paymentId}`).digest("hex");
    expect(verifyRazorpayPaymentSignature(orderId, paymentId, sig)).toBe(true);
    expect(verifyRazorpayPaymentSignature(orderId, paymentId, "bad")).toBe(false);
  });
});
