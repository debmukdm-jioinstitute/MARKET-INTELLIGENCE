import { grantProSubscription, getRazorpayOrderMeta } from "@/lib/payments/pro-entitlement";
import { markRazorpayOrderPaid } from "@/lib/payments/razorpay-store";
import { verifyRazorpayPaymentSignature } from "@/lib/payments/razorpay";
import { getSessionUser } from "@/lib/session";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

/** Standard Checkout — Step 5: verify signature after handler callback. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.guest) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment payload" }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;
  const ok = verifyRazorpayPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!ok) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  await markRazorpayOrderPaid({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
  });

  const meta = await getRazorpayOrderMeta(razorpay_order_id);
  if (meta.userEmail && meta.userEmail !== user.email) {
    return NextResponse.json({ error: "Order does not belong to this account" }, { status: 403 });
  }

  const pro = meta.planId ? await grantProSubscription(user.email, meta.planId) : null;

  return NextResponse.json({
    ok: true,
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    pro,
    message: pro?.active
      ? `Pro active until ${pro.expiresAt ? new Date(pro.expiresAt).toLocaleDateString("en-IN") : "—"}.`
      : "Payment verified.",
  });
}
