import { NextResponse } from "next/server";
import { runScan } from "@/lib/scanner/engine";
import { saveScan } from "@/lib/scanner/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Daily cron (after NSE close): scan the Nifty 500 with every scanner and store the latest result. ?symbols=INFY,TCS for a subset. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const symbols = new URL(req.url).searchParams.get("symbols")?.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  try {
    const run = await runScan({ symbols });
    // A partial run (timeout / Yahoo throttling) must not overwrite a good full scan.
    if (!symbols && run.scanned < run.universe * 0.6) {
      return NextResponse.json({ ok: false, error: "Too few symbols scanned; keeping previous result", scanned: run.scanned, universe: run.universe }, { status: 502 });
    }
    await saveScan(run);
    return NextResponse.json({
      ok: true,
      lastBar: run.lastBar,
      scanned: run.scanned,
      failed: run.failed,
      matches: Object.fromEntries(Object.entries(run.scanners).map(([k, v]) => [k, v.length])),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
