import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { loadBacktest } from "@/lib/scanner/store";

export const dynamic = "force-dynamic";

/** GET → latest scanner backtest (stats per scanner × horizon and ₹10K equity curves). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json({ run: await loadBacktest().catch(() => null) });
}
