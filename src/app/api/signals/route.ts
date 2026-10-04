import { NextResponse } from "next/server";
import { loadSignals } from "@/lib/scanner/store";

export const revalidate = 900;

/** GET → latest AI signals: Nifty model output with walk-forward validation, and Nifty 500 BTST/STBT candidates. */
export async function GET() {
  return NextResponse.json({ run: await loadSignals().catch(() => null) });
}
