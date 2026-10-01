import { getRazorpayPlan, type RazorpayPlanId } from "@/lib/payments/plans";
import { grantProSubscription, getRazorpayOrderMeta } from "@/lib/payments/pro-entitlement";
import { createRazorpayOrder, isRazorpayConfigured, verifyRazorpayPaymentSignature } from "@/lib/payments/razorpay";
import { markRazorpayOrderPaid, recordRazorpayOrderCreated } from "@/lib/payments/razorpay-store";
import type { SessionUser } from "@/lib/auth";
import { z } from "zod";

export const MIN_AMOUNT_PAISE = 100;

export const createOrderBodySchema = z
  .object({
    planId: z.enum(["pro_monthly", "pro_annual"]).optional(),
    amount: z.number().int().optional(),
    currency: z.string().default("INR"),
    receipt: z.string().max(40).optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.planId && val.amount == null) {
      ctx.addIssue({ code: "custom", message: "Provide planId or amount (paise)" });
    }
    if (val.amount != null && val.amount < MIN_AMOUNT_PAISE) {
      ctx.addIssue({ code: "custom", message: `amount must be >= ${MIN_AMOUNT_PAISE} paise` });
    }
  });

export const verifyPaymentBodySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export type CreateOrderResult =
  | { ok: true; order_id: string; orderId: string; amount: number; currency: string; planId?: string; planName?: string }
  | { ok: false; status: number; error: string };

export async function handleCreateRazorpayOrder(
  user: SessionUser,
  body: unknown,
): Promise<CreateOrderResult> {
  if (!isRazorpayConfigured()) {
    return { ok: false, status: 503, error: "Razorpay is not configured on this deployment." };
  }

  const parsed = createOrderBodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return { ok: false, status: 400, error: parsed.error.issues[0]?.message ?? "Invalid request" };
  }

  let amountPaise: number;
  let currency = parsed.data.currency;
  let planId: RazorpayPlanId | undefined;
  let planName: string | undefined;

  if (parsed.data.planId) {
    const plan = getRazorpayPlan(parsed.data.planId);
    if (!plan) return { ok: false, status: 400, error: "Unknown plan" };
    amountPaise = plan.amountPaise;
    currency = plan.currency;
    planId = plan.id;
    planName = plan.name;
  } else {
    amountPaise = parsed.data.amount!;
  }

  if (amountPaise < MIN_AMOUNT_PAISE) {
    return { ok: false, status: 400, error: `amount must be >= ${MIN_AMOUNT_PAISE} paise` };
  }

  const receipt = parsed.data.receipt ?? `mi_${Date.now()}`;

  try {
    const order = await createRazorpayOrder({
      amountPaise,
      currency,
      receipt,
      notes: {
        ...(planId ? { planId } : {}),
        userEmail: user.email,
      },
    });

    await recordRazorpayOrderCreated({
      orderId: order.id,
      userEmail: user.email,
      planId: planId ?? "custom",
      amountPaise,
    });

    return {
      ok: true,
      order_id: order.id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planId,
      planName,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Order creation failed";
    if (/401|authentication|unauthorized/i.test(message)) {
      return { ok: false, status: 401, error: "Razorpay authentication failed — check KEY_ID and KEY_SECRET." };
    }
    return { ok: false, status: 500, error: message };
  }
}

export type VerifyPaymentResult =
  | { ok: true; orderId: string; paymentId: string; message: string; pro?: unknown }
  | { ok: false; status: number; error: string };

export async function handleVerifyRazorpayPayment(
  user: SessionUser,
  body: unknown,
): Promise<VerifyPaymentResult> {
  const parsed = verifyPaymentBodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return { ok: false, status: 400, error: "Missing or invalid payment fields" };
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  const meta = await getRazorpayOrderMeta(razorpay_order_id);
  if (meta.userEmail && meta.userEmail !== user.email) {
    return { ok: false, status: 403, error: "Order does not belong to this account" };
  }

  const valid = verifyRazorpayPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!valid) {
    return { ok: false, status: 400, error: "Payment verification failed — signature mismatch" };
  }

  await markRazorpayOrderPaid({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
  });

  const pro = meta.planId ? await grantProSubscription(user.email, meta.planId) : null;

  return {
    ok: true,
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    pro,
    message: pro?.active
      ? `Pro active until ${pro.expiresAt ? new Date(pro.expiresAt).toLocaleDateString("en-IN") : "—"}.`
      : "Payment verified.",
  };
}
