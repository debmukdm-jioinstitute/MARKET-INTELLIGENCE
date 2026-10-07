import { cronUnauthorized } from "@/lib/api-guard";
import { withCronRun } from "@/lib/admin/cron-log";
import { NextResponse } from "next/server";
import { mergeFnoIntoRun } from "@/lib/scanner/fno-index-model";
import { runSignals } from "@/lib/scanner/signals";
import { loadSignals, saveSignals } from "@/lib/scanner/store";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Daily cron (after NSE close): Nifty next-day/5-day model, walk-forward validation, and Nifty 500 BTST/STBT candidates. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  return withCronRun("signals", req, async () => {
  const sp = new URL(req.url).searchParams;
  const symbols = sp.get("symbols")?.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const indicesOnly = sp.get("indicesOnly") === "1";
  try {
    const run = await runSignals({ symbols, indicesOnly });
    if (!run) return NextResponse.json({ ok: false, error: "Nifty data unavailable" }, { status: 502 });

    const prev = await loadSignals().catch(() => null);
    if (indicesOnly) {
      await saveSignals(mergeFnoIntoRun(prev, { indices: run.indices, lastBar: run.lastBar, nifty: run.nifty }));
    } else if (symbols?.length || run.stocks.scanned >= run.stocks.universe * 0.6) {
      await saveSignals(run);
    } else {
      await saveSignals(mergeFnoIntoRun(prev, { indices: run.indices, lastBar: run.lastBar, nifty: run.nifty }));
    }

    return NextResponse.json({
      ok: true,
      indicesOnly,
      indexKeys: Object.keys(run.indices ?? {}),
      lastBar: run.lastBar,
      scanned: run.stocks.scanned,
      btst: run.stocks.btst.length,
      stbt: run.stocks.stbt.length,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
  },
    (b) => Number((b as { scanned?: number }).scanned) || 0,
  );
}
