import { getRazorpayPlan } from "@/lib/payments/plans";
import { createRazorpayOrder, isRazorpayConfigured } from "@/lib/payments/razorpay";
import { recordRazorpayOrderCreated } from "@/lib/payments/razorpay-store";
import { getSessionUser } from "@/lib/session";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  planId: z.enum(["pro_monthly", "pro_annual"]),
});

/** Standard Checkout — Step 1: create Razorpay Order (server). */
export async function POST(req: Request) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: "Razorpay is not configured on this deployment." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user || user.guest) {
    return NextResponse.json({ error: "Sign in with your account to checkout." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const plan = getRazorpayPlan(parsed.data.planId);
  if (!plan) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });

  const receipt = `mi_${Date.now()}`;
  try {
    const order = await createRazorpayOrder({
      amountPaise: plan.amountPaise,
      currency: plan.currency,
      receipt,
      notes: {
        planId: plan.id,
        userEmail: user.email,
      },
    });

    await recordRazorpayOrderCreated({
      orderId: order.id,
      userEmail: user.email,
      planId: plan.id,
      amountPaise: plan.amountPaise,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planId: plan.id,
      planName: plan.name,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Order creation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
