import { getFreeAiQuotaForUser } from "@/lib/payments/free-ai-quota";
import { getProEntitlement, isProUser } from "@/lib/payments/pro-entitlement";
import { getSessionUser } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.guest) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const pro = await getProEntitlement(user.email);
  const aiAnalyses = await getFreeAiQuotaForUser(user);
  return NextResponse.json({
    pro,
    isPro: isProUser(user, pro),
    aiAnalyses,
  });
}
