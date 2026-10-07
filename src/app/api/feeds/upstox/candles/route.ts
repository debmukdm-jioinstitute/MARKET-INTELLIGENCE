import { findIndiaInstrument, INDIA_INDEX_INSTRUMENT_KEYS } from "@/lib/feeds/india/instruments";
import { INDIA_BENCHMARK_DEFS } from "@/lib/feeds/india/indices";
import {
  candleRangeToDates,
  fetchUpstoxHistoricalCandles,
  fetchUpstoxIntradayCandles,
  type CandleRange,
} from "@/lib/feeds/sources/upstox";
import { fetchYahooCandles, yahooTickerForIndiaSymbol } from "@/lib/feeds/sources/yahoo-candles";
import { NextResponse } from "next/server";

export const revalidate = 300;

const VALID_RANGES: CandleRange[] = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y"];

const INDEX_ALIASES: Record<string, { symbol: string; instrumentKey: string }> = {
  "NIFTY 50": { symbol: "NIFTY 50", instrumentKey: INDIA_INDEX_INSTRUMENT_KEYS.NIFTY },
  NIFTY: { symbol: "NIFTY 50", instrumentKey: INDIA_INDEX_INSTRUMENT_KEYS.NIFTY },
  "BANK NIFTY": { symbol: "BANK NIFTY", instrumentKey: INDIA_INDEX_INSTRUMENT_KEYS.BANKNIFTY },
  BANKNIFTY: { symbol: "BANK NIFTY", instrumentKey: INDIA_INDEX_INSTRUMENT_KEYS.BANKNIFTY },
  SENSEX: { symbol: "SENSEX", instrumentKey: "BSE_INDEX|SENSEX" },
};

/**
 * Every NSE/BSE benchmark with an Upstox instrument key, addressable by its
 * full Upstox key ("NSE_INDEX|NIFTY BANK"), its label ("NIFTY BANK"), the
 * key's trailing segment, and its TrueData name — so index detail pages can
 * request candles with any of those forms.
 */
for (const def of INDIA_BENCHMARK_DEFS) {
  if (!def.upstoxKey) continue;
  const entry = { symbol: def.label, instrumentKey: def.upstoxKey };
  INDEX_ALIASES[def.upstoxKey.toUpperCase()] ??= entry;
  INDEX_ALIASES[def.label.toUpperCase()] ??= entry;
  const tail = def.upstoxKey.split("|").pop();
  if (tail) INDEX_ALIASES[tail.toUpperCase()] ??= entry;
  if (def.trueData) INDEX_ALIASES[def.trueData.toUpperCase()] ??= entry;
}

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
    let candles: Awaited<ReturnType<typeof fetchUpstoxIntradayCandles>> = [];
    if (range === "1D") {
      candles = await fetchUpstoxIntradayCandles(instrument.instrumentKey, "5");
    } else {
      const { from, to } = candleRangeToDates(range);
      candles = await fetchUpstoxHistoricalCandles(instrument.instrumentKey, "days", "1", from, to);
    }

    let source: "upstox" | "yahoo" = "upstox";
    if (!candles.length) {
      const yahoo = yahooTickerForIndiaSymbol(symbol, instrument.symbol);
      candles = await fetchYahooCandles(yahoo, range);
      if (candles.length) source = "yahoo";
    }

    const cache =
      range === "1D"
        ? "public, max-age=30, stale-while-revalidate=60"
        : "public, max-age=300, stale-while-revalidate=600";

    return NextResponse.json(
      { symbol: instrument.symbol, range, candles, source },
      { headers: { "Cache-Control": cache } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upstox candles failed" },
      { status: 502 },
    );
  }
}
