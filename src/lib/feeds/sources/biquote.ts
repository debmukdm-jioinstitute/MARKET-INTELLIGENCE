import { fetchTrueDataQuotes } from "@/lib/feeds/sources/truedata";
import { fetchUpstoxIndiaQuotes } from "@/lib/feeds/sources/upstox";
import { fetchYahooQuotes } from "@/lib/feeds/sources/yahoo";
import type { LiveQuote } from "@/lib/feeds/types";

/** India benchmarks — Upstox (exchange-licensed) primary, Yahoo fallback, TrueData last resort. */
const INDIA_SYMBOLS = ["^NSEI", "^BSESN", "RELIANCE.NS", "HDFCBANK.NS", "INFY.NS"];

/** Yahoo ticker -> TrueData symbol, used only to look up the last-resort fallback. */
const TRUEDATA_SYMBOL: Record<string, string> = {
  "^NSEI": "NIFTY 50",
  "^BSESN": "SENSEX",
  "RELIANCE.NS": "RELIANCE",
  "HDFCBANK.NS": "HDFCBANK",
  "INFY.NS": "INFY",
};

export async function fetchBiquoteIndices(): Promise<LiveQuote[]> {
  const rows = new Map<string, LiveQuote>();

  const upstoxRows = await fetchUpstoxIndiaQuotes(INDIA_SYMBOLS).catch(() => []);
  for (const r of upstoxRows) rows.set(r.symbol, r);

  const missingAfterUpstox = INDIA_SYMBOLS.filter((s) => !rows.has(s));
  if (missingAfterUpstox.length) {
    const yahooRows = await fetchYahooQuotes(missingAfterUpstox).catch(() => []);
    for (const r of yahooRows) rows.set(r.symbol, r);
  }

  const missingAfterYahoo = INDIA_SYMBOLS.filter((s) => !rows.has(s));
  if (missingAfterYahoo.length) {
    const trueDataToYahoo = new Map(missingAfterYahoo.map((s) => [TRUEDATA_SYMBOL[s], s]));
    const tdRows = await fetchTrueDataQuotes(
      [...trueDataToYahoo.keys()].filter((s): s is string => Boolean(s)),
    ).catch(() => []);
    for (const r of tdRows) {
      const yahooSymbol = trueDataToYahoo.get(r.symbol);
      if (yahooSymbol) rows.set(yahooSymbol, r);
    }
  }

  return [...rows.values()].map((r) => ({ ...r, symbol: r.symbol.replace("^", "") }));
}
