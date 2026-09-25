import { cronUnauthorized } from "@/lib/api-guard";
import { NextResponse } from "next/server";
import { runSignals } from "@/lib/scanner/signals";
import { saveSignals } from "@/lib/scanner/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Daily cron (after NSE close): Nifty next-day/5-day model, walk-forward validation, and Nifty 500 BTST/STBT candidates. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  const symbols = new URL(req.url).searchParams.get("symbols")?.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  try {
    const run = await runSignals({ symbols });
    if (!run) return NextResponse.json({ ok: false, error: "Nifty data unavailable" }, { status: 502 });
    if (!symbols && run.stocks.scanned < run.stocks.universe * 0.6) {
      return NextResponse.json({ ok: false, error: "Too few stocks scanned; keeping previous result", scanned: run.stocks.scanned }, { status: 502 });
    }
    await saveSignals(run);
    return NextResponse.json({ ok: true, lastBar: run.lastBar, scanned: run.stocks.scanned, btst: run.stocks.btst.length, stbt: run.stocks.stbt.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
