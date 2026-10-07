import { getRazorpayPlan, PAID_PLAN_IDS, type RazorpayPlanId } from "@/lib/payments/plans";
import { grantProSubscription, grantProDays, getRazorpayOrderMeta } from "@/lib/payments/pro-entitlement";
import { createRazorpayOrder, isRazorpayConfigured, verifyRazorpayPaymentSignature } from "@/lib/payments/razorpay";
import { markRazorpayOrderPaid, recordRazorpayOrderCreated } from "@/lib/payments/razorpay-store";
import { ensureSchema, sql } from "@/lib/db";
import { awardXp } from "@/lib/gamification/store";
import type { SessionUser } from "@/lib/auth";
import { z } from "zod";

export const MIN_AMOUNT_PAISE = 100;

export const createOrderBodySchema = z
  .object({
    planId: z.enum(PAID_PLAN_IDS).optional(),
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

/**
 * Converts a pending referral when the referee makes their FIRST paid
 * purchase: marks the referral converted, grants the referrer 30 days of
 * Plus, and awards XP to both sides. Idempotent and fully guarded — a failure
 * here must never break payment verification.
 */
async function convertReferralOnFirstPurchase(buyerEmail: string): Promise<void> {
  await ensureSchema();
  const db = sql();

  const userRows = (await db`
    SELECT referred_by FROM users WHERE email = ${buyerEmail}
  `) as { referred_by: string | null }[];
  const referrerEmail = userRows[0]?.referred_by?.trim().toLowerCase();
  if (!referrerEmail) return;

  const pending = (await db`
    SELECT id FROM referrals
    WHERE referee_email = ${buyerEmail} AND status = 'pending'
    LIMIT 1
  `) as { id: string }[];
  if (pending.length === 0) return;

  await db`
    UPDATE referrals SET status = 'converted', converted_at = now()
    WHERE id = ${pending[0].id} AND status = 'pending'
  `;
  await grantProDays(referrerEmail, 30, "pro_monthly");
  await awardXp(referrerEmail, "referral_converted", buyerEmail);
  await awardXp(buyerEmail, "referral_bonus_buyer", null);
}

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

  // Capture the buyer's pre-grant Pro state: referral conversion applies only
  // to the very first paid purchase (self-referral is already impossible —
  // signup rejects attributing a code to its owner's own email).
  let hadProBefore = false;
  try {
    await ensureSchema();
    const before = (await sql()`
      SELECT pro_expires_at FROM users WHERE email = ${user.email}
    `) as { pro_expires_at: Date | string | null }[];
    const exp = before[0]?.pro_expires_at ?? null;
    hadProBefore = exp !== null && new Date(exp).getTime() > Date.now();
  } catch {
    // Non-fatal: a failed read just skips the referral hook.
  }

  const pro = meta.planId ? await grantProSubscription(user.email, meta.planId) : null;

  if (meta.planId && pro?.active && !hadProBefore) {
    try {
      await convertReferralOnFirstPurchase(user.email);
    } catch (e) {
      console.warn("[referral] post-purchase conversion failed:", e);
    }
  }

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
