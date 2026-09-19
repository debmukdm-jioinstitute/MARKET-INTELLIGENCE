import { feedFetch } from "@/lib/feeds/http";
import type { LiveQuote } from "@/lib/feeds/types";

/** Stooq free delayed CSV — used when Yahoo is unavailable for a symbol. */
export async function fetchStooqQuotes(symbols: string[]): Promise<LiveQuote[]> {
  const stooqSymbols = symbols.map((s) => `${s.toLowerCase()}.us`);
  const url = `https://stooq.com/q/l/?s=${stooqSymbols.join(",")}&f=sd2t2ohlcv&h&e=csv`;
  const res = await feedFetch(url, { timeoutMs: 20_000 });
  if (!res.ok) throw new Error(`Stooq HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/).slice(1);
  const asOf = new Date().toISOString();
  const out: LiveQuote[] = [];
  for (const line of lines) {
    const [sym, , , , close] = line.split(",");
    if (!sym || !close) continue;
    const symbol = sym.replace(".US", "").toUpperCase();
    const price = Number(close);
    if (!Number.isFinite(price)) continue;
    out.push({
      symbol,
      price,
      change: 0,
      changePct: 0,
      asOf,
      provider: "stooq",
    });
  }
  return out;
}
