import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { loadSignals } from "@/lib/scanner/store";

export const dynamic = "force-dynamic";

/** GET → latest AI signals: Nifty model output with walk-forward validation, and Nifty 500 BTST/STBT candidates. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json({ run: await loadSignals().catch(() => null) });
}
