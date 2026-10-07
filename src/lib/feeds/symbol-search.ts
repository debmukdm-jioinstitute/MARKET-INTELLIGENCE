import { gunzipSync } from "node:zlib";
import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import { feedFetch } from "@/lib/feeds/http";
import {
  aliasSymbol,
  compactToken,
  editDistance,
  normalizeSymbolQuery,
  queryTokens,
} from "@/lib/feeds/symbol-normalize";
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

let nseLoading: Promise<SymbolSearchHit[]> | null = null;

async function loadNseEquityIndex(): Promise<SymbolSearchHit[]> {
  if (nseEquityIndex && Date.now() - nseLoadedAt < NSE_TTL_MS) return nseEquityIndex;
  // Coalesce concurrent cold-start loads: one 1.9 MB download per instance, not one per request.
  if (!nseLoading) {
    nseLoading = downloadNseEquityIndex().finally(() => {
      nseLoading = null;
    });
  }
  return nseLoading;
}

async function downloadNseEquityIndex(): Promise<SymbolSearchHit[]> {
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

/**
 * Score a hit against a natural-language query.
 * Handles spacing ("JP POWER" → JPPOWER), aliases, token overlap, and light typos.
 */
export function scoreHit(rawQuery: string, hit: SymbolSearchHit): number {
  const spaced = normalizeSymbolQuery(rawQuery);
  const compact = compactToken(rawQuery);
  if (!spaced && !compact) return 0;

  const sym = hit.symbol.toUpperCase();
  const nameSpaced = normalizeSymbolQuery(hit.name);
  const nameCompact = compactToken(hit.name);
  const alias = aliasSymbol(rawQuery);

  if (alias && alias === sym) return 1100;
  if (sym === spaced || sym === compact) return 1000;
  if (compact && sym.startsWith(compact)) return 850 - Math.min(sym.length - compact.length, 40);
  if (spaced && nameSpaced.startsWith(spaced)) return 700;
  if (compact && nameCompact.startsWith(compact)) return 680;
  if (compact && sym.includes(compact)) return 520;
  if (spaced && nameSpaced.includes(spaced)) return 480;
  if (compact && nameCompact.includes(compact)) return 460;

  const tokens = queryTokens(rawQuery);
  if (tokens.length) {
    const nameTokenList = queryTokens(hit.name);
    const nameTokens = new Set(nameTokenList);
    // Exact-or-substring hit first; if that fails, allow one bounded-edit-
    // distance typo per token (>=5 chars only, to avoid false positives on
    // short/common tokens like "bank" vs "rank"). This is what lets a
    // multi-word company name survive more than one misspelled word at once
    // — e.g. "reliance indutries limited compnay" ("indutries" typo'd,
    // "compnay" typo'd and not even part of the real name) still needs
    // "indutries" ~ "industries" to register as a hit for RELIANCE to score
    // at all; a single edit-distance check on the whole compacted string
    // (the branches above) only ever catches a typo in a *single*-word
    // query, not a typo buried inside a longer sentence.
    const hitCount = tokens.filter((t) => {
      if (nameTokens.has(t) || sym.includes(t)) return true;
      if (t.length < 5) return false;
      return nameTokenList.some(
        (nt) => Math.abs(nt.length - t.length) <= 2 && editDistance(t, nt, 2) <= 1,
      );
    }).length;
    if (hitCount === tokens.length && tokens.length >= 2) return 420 + hitCount * 20;
    if (hitCount > 0 && hitCount >= Math.ceil(tokens.length * 0.6)) return 280 + hitCount * 25;
    // Weak tier: a full sentence ("is it safe to invest in adani") carries
    // mostly grammatical filler that will never appear in a company name, so
    // the 60%-overlap bar above is nearly impossible to clear even when the
    // one content word that matters (the company name) is spelled exactly
    // right. Requirement 1/"done" bullet 2 forbid a bare empty dropdown for
    // this shape of query; a low, last-place score (well below every branch
    // above, and below a help/page match in the UI's own ordering — see
    // symbol-search.tsx) surfaces the symbol as a low-confidence suggestion
    // instead of nothing, without letting a single stray token outrank a
    // real ticker/company match anywhere above.
    if (hitCount > 0) return 60 + hitCount * 15;
  }

  // Light typo tolerance on compact symbol / primary name token (short queries only).
  if (compact.length >= 4 && compact.length <= 12) {
    const dSym = editDistance(compact, sym, 2);
    if (dSym <= 1) return 360 - dSym * 40;
    if (dSym === 2 && Math.abs(compact.length - sym.length) <= 1) return 220;
    const primary = nameCompact.slice(0, Math.max(compact.length + 2, 8));
    const dName = editDistance(compact, primary.slice(0, compact.length), 2);
    if (dName <= 1) return 300 - dName * 30;
  }

  return 0;
}

export async function searchSymbols(query: string, limit = 16): Promise<SymbolSearchHit[]> {
  const q = query.trim();
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
  const sym = compactToken(symbol) || symbol.trim().toUpperCase();
  if (!sym) return null;

  const aliased = aliasSymbol(symbol);
  const want = aliased ?? sym;

  const us = US_INDEX.find((h) => h.symbol === want);
  if (us) return us;

  const curated = INDIA_CURATED.find((h) => h.symbol === want);
  if (curated) return curated;

  try {
    const nse = await loadNseEquityIndex();
    const exact = nse.find((h) => h.symbol === want);
    if (exact) return exact;
  } catch {
    /* fall through */
  }

  // Fuzzy fallback for natural-language company names.
  const hits = await searchSymbols(symbol, 1);
  return hits[0] ?? null;
}
