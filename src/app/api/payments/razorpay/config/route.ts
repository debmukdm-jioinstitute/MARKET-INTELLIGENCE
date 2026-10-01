import { formatInrFromPaise, getRazorpayPlans } from "@/lib/payments/plans";
import { getRazorpayKeyId, isRazorpayConfigured } from "@/lib/payments/razorpay";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Public checkout config (key id + plan catalog). */
export async function GET() {
  const plans = getRazorpayPlans().map((p) => ({
    ...p,
    displayAmount: formatInrFromPaise(p.amountPaise),
  }));

  return NextResponse.json({
    enabled: isRazorpayConfigured(),
    keyId: getRazorpayKeyId(),
    plans,
    checkoutScript: "https://checkout.razorpay.com/v1/checkout.js",
  });
}
