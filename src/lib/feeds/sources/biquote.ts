import { fetchTrueDataQuotes } from "@/lib/feeds/sources/truedata";
import { fetchUpstoxIndiaQuotes } from "@/lib/feeds/sources/upstox";
import { fetchYahooQuotes } from "@/lib/feeds/sources/yahoo";
import type { LiveQuote } from "@/lib/feeds/types";

/** NSE/BSE index tickers only — no single stocks (those live in the equities table). */
export const INDIA_BENCHMARK_YAHOO_SYMBOLS = ["^NSEI", "^BSESN", "^NSEBANK", "^INDIAVIX"] as const;

const INDEX_META: Record<
  (typeof INDIA_BENCHMARK_YAHOO_SYMBOLS)[number],
  { label: string; name: string }
> = {
  "^NSEI": { label: "Nifty 50", name: "Nifty 50 · NSE" },
  "^BSESN": { label: "SENSEX", name: "S&P BSE SENSEX" },
  "^NSEBANK": { label: "Nifty Bank", name: "Nifty Bank · NSE" },
  "^INDIAVIX": { label: "India VIX", name: "India VIX · NSE" },
};

/** Yahoo ticker -> TrueData symbol, used only to look up the last-resort fallback. */
const TRUEDATA_SYMBOL: Partial<Record<(typeof INDIA_BENCHMARK_YAHOO_SYMBOLS)[number], string>> = {
  "^NSEI": "NIFTY 50",
  "^BSESN": "SENSEX",
  "^NSEBANK": "NIFTY BANK",
  "^INDIAVIX": "INDIA VIX",
};

export async function fetchBiquoteIndices(): Promise<LiveQuote[]> {
  const symbols = [...INDIA_BENCHMARK_YAHOO_SYMBOLS];
  const rows = new Map<string, LiveQuote>();

  const upstoxRows = await fetchUpstoxIndiaQuotes(symbols).catch(() => []);
  for (const r of upstoxRows) rows.set(r.symbol, r);

  const missingAfterUpstox = symbols.filter((s) => !rows.has(s));
  if (missingAfterUpstox.length) {
    const yahooRows = await fetchYahooQuotes(missingAfterUpstox).catch(() => []);
    for (const r of yahooRows) rows.set(r.symbol, r);
  }

  const missingAfterYahoo = symbols.filter((s) => !rows.has(s));
  if (missingAfterYahoo.length) {
    const trueDataToYahoo = new Map(
      missingAfterYahoo
        .map((s) => [TRUEDATA_SYMBOL[s], s] as const)
        .filter(([td]) => Boolean(td)),
    );
    const tdRows = await fetchTrueDataQuotes([...trueDataToYahoo.keys()] as string[]).catch(() => []);
    for (const r of tdRows) {
      const yahooSymbol = trueDataToYahoo.get(r.symbol);
      if (yahooSymbol) rows.set(yahooSymbol, r);
    }
  }

  return symbols
    .map((yahooSym) => {
      const r = rows.get(yahooSym);
      if (!r) return null;
      const meta = INDEX_META[yahooSym];
      return {
        ...r,
        symbol: meta.label,
        name: meta.name,
        currency: "INR" as const,
      };
    })
    .filter((r): r is LiveQuote => r != null);
}
