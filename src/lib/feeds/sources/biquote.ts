import { fetchYahooQuotes } from "@/lib/feeds/sources/yahoo";
import type { LiveQuote } from "@/lib/feeds/types";

/** India benchmark & liquid names via Yahoo (.NS / index tickers) — “live quote” lane for NSE/BSE. */
const INDIA_SYMBOLS = ["^NSEI", "^BSESN", "RELIANCE.NS", "HDFCBANK.NS", "INFY.NS"];

export async function fetchBiquoteIndices(): Promise<LiveQuote[]> {
  const rows = await fetchYahooQuotes(INDIA_SYMBOLS);
  return rows.map((r) => ({
    ...r,
    provider: "biquote" as const,
    symbol: r.symbol.replace("^", ""),
  }));
}
