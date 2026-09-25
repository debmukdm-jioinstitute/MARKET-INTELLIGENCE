import { findIndiaInstrument, INDIA_INDEX_INSTRUMENT_KEYS } from "@/lib/feeds/india/instruments";
import {
  candleRangeToDates,
  fetchUpstoxHistoricalCandles,
  fetchUpstoxIntradayCandles,
  type CandleRange,
} from "@/lib/feeds/sources/upstox";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VALID_RANGES: CandleRange[] = ["1D", "1W", "1M", "3M", "6M", "1Y"];

const INDEX_ALIASES: Record<string, { symbol: string; instrumentKey: string }> = {
  "NIFTY 50": { symbol: "NIFTY 50", instrumentKey: INDIA_INDEX_INSTRUMENT_KEYS.NIFTY },
  NIFTY: { symbol: "NIFTY 50", instrumentKey: INDIA_INDEX_INSTRUMENT_KEYS.NIFTY },
  "BANK NIFTY": { symbol: "BANK NIFTY", instrumentKey: INDIA_INDEX_INSTRUMENT_KEYS.BANKNIFTY },
  BANKNIFTY: { symbol: "BANK NIFTY", instrumentKey: INDIA_INDEX_INSTRUMENT_KEYS.BANKNIFTY },
  SENSEX: { symbol: "SENSEX", instrumentKey: "BSE_INDEX|SENSEX" },
};

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const symbol = params.get("symbol");
  const range = (params.get("range") ?? "3M") as CandleRange;

  if (!symbol) {
    return NextResponse.json({ error: "symbol query param required" }, { status: 400 });
  }
  const instrument = INDEX_ALIASES[symbol.toUpperCase()] ?? findIndiaInstrument(symbol);
  if (!instrument) {
    return NextResponse.json({ error: `Unknown India symbol: ${symbol}` }, { status: 404 });
  }
  if (!VALID_RANGES.includes(range)) {
    return NextResponse.json({ error: `Invalid range: ${range}` }, { status: 400 });
  }

  try {
    if (range === "1D") {
      const candles = await fetchUpstoxIntradayCandles(instrument.instrumentKey, "5");
      return NextResponse.json(
        { symbol: instrument.symbol, range, candles },
        { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } },
      );
    }
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
