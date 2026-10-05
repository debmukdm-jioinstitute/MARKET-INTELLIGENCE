import { rateLimited } from "@/lib/api-guard";
import { fetchBars, resolveInstrument } from "@/lib/trade-lab/data";
import { TIMEFRAMES, type Timeframe } from "@/lib/trade-lab/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BARS = 500;

function ip(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
}

/** GET ?symbol=NIFTY&tf=1d → raw OHLCV bars. The chart computes the selected indicators client-side from these. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const tf = (sp.get("tf") ?? "1d") as Timeframe;
  const tfMeta = TIMEFRAMES.find((t) => t.id === tf);
  if (!tfMeta) return NextResponse.json({ error: "Invalid timeframe" }, { status: 400 });
  const inst = resolveInstrument(sp.get("symbol") ?? "NIFTY");
  if (!inst) return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  // Never let a slow limiter store stall the chart: after 2s, fail open.
  const limited = await Promise.race([rateLimited(`trade-bars:${ip(req)}`, 120, 60), new Promise<boolean>((r) => setTimeout(() => r(false), 2000))]);
  if (limited) {
    return NextResponse.json({ error: "Too many requests, try again in a minute." }, { status: 429 });
  }
  const data = await fetchBars(inst, tf);
  if (!data || !data.bars.length) {
    return NextResponse.json({ error: `No market data available for ${inst.label} (${tf}).` }, { status: 404 });
  }
  return NextResponse.json(
    { symbol: inst.id, label: inst.label, tf, intraday: tfMeta.intraday, hasVolume: data.hasVolume, source: data.source, bars: data.bars.slice(-MAX_BARS) },
    { headers: { "Cache-Control": tfMeta.intraday ? "public, s-maxage=30, stale-while-revalidate=60" : "public, s-maxage=120, stale-while-revalidate=300" } },
  );
}
