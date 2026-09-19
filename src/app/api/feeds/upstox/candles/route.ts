import { findIndiaInstrument } from "@/lib/feeds/india/instruments";
import { candleRangeToDates, fetchUpstoxHistoricalCandles, type CandleRange } from "@/lib/feeds/sources/upstox";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VALID_RANGES: CandleRange[] = ["1M", "3M", "6M", "1Y"];

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const symbol = params.get("symbol");
  const range = (params.get("range") ?? "3M") as CandleRange;

  if (!symbol) {
    return NextResponse.json({ error: "symbol query param required" }, { status: 400 });
  }
  const instrument = findIndiaInstrument(symbol);
  if (!instrument) {
    return NextResponse.json({ error: `Unknown India symbol: ${symbol}` }, { status: 404 });
  }
  if (!VALID_RANGES.includes(range)) {
    return NextResponse.json({ error: `Invalid range: ${range}` }, { status: 400 });
  }

  try {
    const { from, to } = candleRangeToDates(range);
    const candles = await fetchUpstoxHistoricalCandles(instrument.instrumentKey, "days", "1", from, to);
    return NextResponse.json(
      { symbol: instrument.symbol, range, candles },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upstox candles failed" },
      { status: 502 },
    );
  }
}
