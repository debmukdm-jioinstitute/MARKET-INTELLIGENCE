import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "node:crypto";

export type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
};

let client: Razorpay | null = null;

export function isRazorpayConfigured(): boolean {
  return Boolean(getRazorpayKeySecret() && getRazorpayKeyId());
}

/** Server + client checkout — use NEXT_PUBLIC_RAZORPAY_KEY_ID in production. */
export function getRazorpayKeyId(): string | null {
  return (
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() ||
    process.env.RAZORPAY_KEY_ID?.trim() ||
    null
  );
}

export function getRazorpayKeySecret(): string | null {
  return process.env.RAZORPAY_KEY_SECRET?.trim() || null;
}

function getRazorpayClient(): Razorpay {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys not configured");
  }
  if (!client) {
    client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return client;
}

/** Step 1 — create Order via Razorpay SDK (server only). */
export async function createRazorpayOrder(input: {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrderResponse> {
  const rzp = getRazorpayClient();
  try {
    const order = await rzp.orders.create({
      amount: input.amountPaise,
      currency: input.currency,
      receipt: input.receipt.slice(0, 40),
      notes: input.notes,
    });
    return {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      receipt: order.receipt ?? undefined,
    };
  } catch (e: unknown) {
    const err = e as { statusCode?: number; error?: { description?: string } };
    const code = err.statusCode ?? 500;
    const desc = err.error?.description ?? (e instanceof Error ? e.message : "Razorpay order failed");
    throw new Error(`Razorpay order API ${code}: ${desc}`);
  }
}

/** Step 3 — verify payment signature (order_id|payment_id). */
export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const secret = getRazorpayKeySecret();
  if (!secret || !orderId || !paymentId || !signature) return false;

  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
