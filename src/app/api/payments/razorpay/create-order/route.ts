import { handleCreateRazorpayOrder } from "@/lib/payments/razorpay-handlers";
import { getSessionUser } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.guest) {
    return NextResponse.json({ error: "Sign in with your account to checkout." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const result = await handleCreateRazorpayOrder(user, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
