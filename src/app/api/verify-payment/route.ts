import { handleVerifyRazorpayPayment } from "@/lib/payments/razorpay-handlers";
import { getSessionUser } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Razorpay Standard Checkout — POST /api/verify-payment (alias). */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.guest) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const result = await handleVerifyRazorpayPayment(user, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
