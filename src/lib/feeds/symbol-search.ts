import { gunzipSync } from "node:zlib";
import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import { feedFetch } from "@/lib/feeds/http";
import { UNIVERSE } from "@/lib/universe";

export type SymbolMarket = "IN" | "US";

export type SymbolSearchHit = {
  symbol: string;
  name: string;
  market: SymbolMarket;
  instrumentKey?: string;
  isin?: string;
  exchange?: string;
};

const NSE_GZ = "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz";

let nseEquityIndex: SymbolSearchHit[] | null = null;
let nseLoadedAt = 0;
const NSE_TTL_MS = 6 * 60 * 60_000;

const US_INDEX: SymbolSearchHit[] = UNIVERSE.map((u) => ({
  symbol: u.symbol,
  name: u.name,
  market: "US" as const,
  exchange: u.region === "US" ? "US" : u.region,
}));

const INDIA_CURATED: SymbolSearchHit[] = INDIA_EQUITIES.map((i) => ({
  symbol: i.symbol,
  name: i.name,
  market: "IN" as const,
  instrumentKey: i.instrumentKey,
  isin: i.isin,
  exchange: "NSE",
}));

type UpstoxInstrumentRow = {
  segment?: string;
  name?: string;
  trading_symbol?: string;
  instrument_key?: string;
  isin?: string;
  exchange?: string;
};

async function loadNseEquityIndex(): Promise<SymbolSearchHit[]> {
  if (nseEquityIndex && Date.now() - nseLoadedAt < NSE_TTL_MS) return nseEquityIndex;
  const res = await feedFetch(NSE_GZ, { timeoutMs: 45_000 });
  if (!res.ok) throw new Error(`NSE instrument master HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const json = JSON.parse(gunzipSync(buf).toString("utf8")) as UpstoxInstrumentRow[];
  nseEquityIndex = json
    .filter((r) => r.segment === "NSE_EQ" && r.trading_symbol && r.instrument_key)
    .map((r) => ({
      symbol: r.trading_symbol!.toUpperCase(),
      name: r.name ?? r.trading_symbol!,
      market: "IN" as const,
      instrumentKey: r.instrument_key,
      isin: r.isin,
      exchange: "NSE",
    }));
  nseLoadedAt = Date.now();
  return nseEquityIndex;
}

function scoreHit(q: string, hit: SymbolSearchHit): number {
  const sym = hit.symbol.toUpperCase();
  const name = hit.name.toUpperCase();
  if (sym === q) return 1000;
  if (sym.startsWith(q)) return 800 - (sym.length - q.length);
  if (name.startsWith(q)) return 600;
  if (sym.includes(q)) return 400;
  if (name.includes(q)) return 200;
  return 0;
}

export async function searchSymbols(query: string, limit = 16): Promise<SymbolSearchHit[]> {
  const q = query.trim().toUpperCase();
  if (!q) return [];

  const indiaMap = new Map<string, SymbolSearchHit>();
  for (const h of INDIA_CURATED) indiaMap.set(h.symbol, h);

  try {
    const nse = await loadNseEquityIndex();
    for (const h of nse) {
      if (!indiaMap.has(h.symbol)) indiaMap.set(h.symbol, h);
    }
  } catch {
    /* curated India list still searchable */
  }

  const pool = [...US_INDEX, ...indiaMap.values()];
  const scored = pool
    .map((h) => ({ h, s: scoreHit(q, h) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.h.symbol.localeCompare(b.h.symbol));

  const seen = new Set<string>();
  const out: SymbolSearchHit[] = [];
  for (const { h } of scored) {
    const key = `${h.market}:${h.symbol}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
    if (out.length >= limit) break;
  }
  return out;
}

export async function resolveSymbol(symbol: string): Promise<SymbolSearchHit | null> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return null;

  const us = US_INDEX.find((h) => h.symbol === sym);
  if (us) return us;

  const curated = INDIA_CURATED.find((h) => h.symbol === sym);
  if (curated) return curated;

  try {
    const nse = await loadNseEquityIndex();
    return nse.find((h) => h.symbol === sym) ?? null;
  } catch {
    return null;
  }
}
