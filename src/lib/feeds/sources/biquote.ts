import {
  INDIA_BENCHMARK_YAHOO_SYMBOLS,
  indiaBenchmarkDef,
  indiaBenchmarkTrueDataMap,
} from "@/lib/feeds/india/indices";
import { fetchTrueDataQuotes } from "@/lib/feeds/sources/truedata";
import { getQuotes } from "@/lib/feeds/quotes";
import type { LiveQuote } from "@/lib/feeds/types";

export { INDIA_BENCHMARK_YAHOO_SYMBOLS } from "@/lib/feeds/india/indices";

const TRUEDATA = indiaBenchmarkTrueDataMap();

export async function fetchBiquoteIndices(): Promise<LiveQuote[]> {
  const symbols = INDIA_BENCHMARK_YAHOO_SYMBOLS;
  const rows = new Map<string, LiveQuote>();

  // Unified quote bundle: Upstox (official) > Massive > Yahoo v7 batch > Stooq,
  // all internally batched — replaces the old sequential Upstox-then-Yahoo.
  const bundle = await getQuotes(symbols).catch(() => null);
  for (const r of bundle?.quotes ?? []) rows.set(r.quote.symbol, r.quote);

  const missingAfterBundle = symbols.filter((s) => !rows.has(s));
  if (missingAfterBundle.length) {
    const trueDataToYahoo = new Map<string, string>();
    for (const y of missingAfterBundle) {
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
