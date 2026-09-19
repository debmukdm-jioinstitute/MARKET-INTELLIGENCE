import { fetchTrueDataQuotes } from "@/lib/feeds/sources/truedata";
import { fetchYahooQuotes } from "@/lib/feeds/sources/yahoo";
import type { LiveQuote } from "@/lib/feeds/types";

/** India benchmark & liquid names — Yahoo primary, TrueData (authorised NSE/BSE vendor) fallback. */
const INDIA_SYMBOLS = ["^NSEI", "^BSESN", "RELIANCE.NS", "HDFCBANK.NS", "INFY.NS"];

/** Yahoo ticker -> TrueData symbol, used only to look up the fallback when Yahoo is missing a row. */
const TRUEDATA_SYMBOL: Record<string, string> = {
  "^NSEI": "NIFTY 50",
  "^BSESN": "SENSEX",
  "RELIANCE.NS": "RELIANCE",
  "HDFCBANK.NS": "HDFCBANK",
  "INFY.NS": "INFY",
};

export async function fetchBiquoteIndices(): Promise<LiveQuote[]> {
  const yahooRows = await fetchYahooQuotes(INDIA_SYMBOLS).catch(() => []);
  const have = new Set(yahooRows.map((r) => r.symbol));
  const missing = INDIA_SYMBOLS.filter((s) => !have.has(s));

  let fallbackRows: LiveQuote[] = [];
  if (missing.length) {
    const trueDataToYahoo = new Map(missing.map((s) => [TRUEDATA_SYMBOL[s], s]));
    const tdRows = await fetchTrueDataQuotes([...trueDataToYahoo.keys()].filter((s): s is string => Boolean(s))).catch(
      () => [],
    );
    fallbackRows = tdRows
      .map((r) => {
        const yahooSymbol = trueDataToYahoo.get(r.symbol);
        return yahooSymbol ? { ...r, symbol: yahooSymbol } : null;
      })
      .filter((r): r is LiveQuote => r !== null);
  }

  return [...yahooRows, ...fallbackRows].map((r) => ({
    ...r,
    symbol: r.symbol.replace("^", ""),
  }));
}
