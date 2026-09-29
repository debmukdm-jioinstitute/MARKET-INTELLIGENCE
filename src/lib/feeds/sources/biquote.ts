import {
  INDIA_BENCHMARK_YAHOO_SYMBOLS,
  indiaBenchmarkDef,
  indiaBenchmarkTrueDataMap,
} from "@/lib/feeds/india/indices";
import { fetchTrueDataQuotes } from "@/lib/feeds/sources/truedata";
import { fetchUpstoxIndiaQuotes } from "@/lib/feeds/sources/upstox";
import { fetchYahooQuotes } from "@/lib/feeds/sources/yahoo";
import type { LiveQuote } from "@/lib/feeds/types";

export { INDIA_BENCHMARK_YAHOO_SYMBOLS } from "@/lib/feeds/india/indices";

const TRUEDATA = indiaBenchmarkTrueDataMap();

export async function fetchBiquoteIndices(): Promise<LiveQuote[]> {
  const symbols = INDIA_BENCHMARK_YAHOO_SYMBOLS;
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
    const trueDataToYahoo = new Map<string, string>();
    for (const y of missingAfterYahoo) {
      const td = TRUEDATA[y];
      if (td) trueDataToYahoo.set(td, y);
    }
    if (trueDataToYahoo.size) {
      const tdRows = await fetchTrueDataQuotes([...trueDataToYahoo.keys()]).catch(() => []);
      for (const r of tdRows) {
        const yahooSymbol = trueDataToYahoo.get(r.symbol);
        if (yahooSymbol) rows.set(yahooSymbol, r);
      }
    }
  }

  const out: LiveQuote[] = [];
  for (const yahooSym of symbols) {
    const r = rows.get(yahooSym);
    if (!r) continue;
    const meta = indiaBenchmarkDef(yahooSym);
    if (!meta) continue;
    out.push({
      symbol: meta.label,
      name: meta.name,
      price: r.price,
      change: r.change,
      changePct: r.changePct,
      currency: "INR",
      asOf: r.asOf,
      provider: r.provider,
    });
  }
  return out;
}
