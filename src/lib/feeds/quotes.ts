import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import { timed } from "@/lib/feeds/http";
import { fetchMassiveUsQuotes, hasMassiveApiKey } from "@/lib/feeds/sources/massive";
import { fetchStooqQuotes } from "@/lib/feeds/sources/stooq";
import {
  INDIA_INSTRUMENT_KEYS,
  fetchUpstoxQuotes,
} from "@/lib/feeds/sources/upstox/quotes";
import { fetchYahooQuotes } from "@/lib/feeds/sources/yahoo";
import type { LiveQuote } from "@/lib/feeds/types";

/**
 * Unified quote service — the single entry point for live quotes.
 *
 * Source priority (official-first, cheapest-first):
 *   1. Upstox — exchange-licensed NSE/BSE data, 1 batched request for all
 *      known instrument keys (benchmarks + curated India equities).
 *   2. Massive — keyed US snapshot API, already batched (skipped when no key).
 *   3. Yahoo v7 batch — 1 request for ~100 symbols (was: 1 request/symbol).
 *   4. Stooq CSV — 1 batched request, delayed quotes as last resort.
 *   5. Persisted last-good (Neon) — served with stale=true when every live
 *      source fails. Real delayed data, never invented.
 *
 * Fan-out control:
 *   - Every source above is internally batched: a 44-symbol tape costs ~4-5
 *     upstream requests total, not ~100.
 *   - In-memory TTL cache (per serverless instance) + singleflight: concurrent
 *     callers for the same symbol set share one fetch.
 *   - Last-good writes are throttled (one batched upsert per minute max).
 */

export type QuoteResult = {
  quote: LiveQuote;
  /** True when served from persisted last-good because all live sources failed. */
  stale: boolean;
};

export type QuoteSourceId = "upstox" | "massive" | "yahoo" | "stooq" | "last-good";

export type QuoteSourceStatus = {
  id: QuoteSourceId;
  ok: boolean;
  latencyMs: number;
  count: number;
  error?: string;
};

export type GetQuotesResult = {
  quotes: QuoteResult[];
  sources: QuoteSourceStatus[];
};

const QUOTE_CACHE_TTL_MS = 60_000;
const LAST_GOOD_WRITE_THROTTLE_MS = 60_000;

/** Yahoo-style symbol (upper-cased) -> Upstox instrument key. */
const UPSTOX_SYMBOL_MAP = new Map<string, string>();
for (const [sym, key] of Object.entries(INDIA_INSTRUMENT_KEYS)) {
  UPSTOX_SYMBOL_MAP.set(sym.toUpperCase(), key);
}
for (const inst of INDIA_EQUITIES) {
  if (inst.symbol && inst.instrumentKey) {
    UPSTOX_SYMBOL_MAP.set(inst.symbol.toUpperCase(), inst.instrumentKey);
    UPSTOX_SYMBOL_MAP.set(`${inst.symbol.toUpperCase()}.NS`, inst.instrumentKey);
  }
}

const cache = new Map<string, { at: number; result: GetQuotesResult }>();
const inflight = new Map<string, Promise<GetQuotesResult>>();
let lastPersistAt = 0;

function cacheKey(symbols: string[]): string {
  return symbols.join("\n");
}

function status(
  id: QuoteSourceId,
  r: { value?: unknown; error?: string; latencyMs: number },
  count: number,
): QuoteSourceStatus {
  return {
    id,
    ok: !r.error,
    latencyMs: r.latencyMs,
    count,
    error: r.error,
  };
}

/**
 * Fetch fresh quotes for symbols from all live sources in parallel (each
 * source internally batched), merge by official-first priority, and backfill
 * anything still missing from persisted last-good with stale=true.
 */
export async function getQuotes(symbols: string[]): Promise<GetQuotesResult> {
  const unique = [...new Set(symbols.map((s) => s.trim()).filter(Boolean))].sort();
  if (unique.length === 0) return { quotes: [], sources: [] };

  const key = cacheKey(unique);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < QUOTE_CACHE_TTL_MS) return hit.result;

  const ongoing = inflight.get(key);
  if (ongoing) return ongoing;

  const p = fetchQuotesFresh(unique).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, p);
  const result = await p;
  cache.set(key, { at: Date.now(), result });
  return result;
}

async function fetchQuotesFresh(symbols: string[]): Promise<GetQuotesResult> {
  const upstoxInstruments = symbols
    .map((symbol) => {
      const instrumentKey = UPSTOX_SYMBOL_MAP.get(symbol.toUpperCase());
      return instrumentKey ? { instrumentKey, symbol } : null;
    })
    .filter((i): i is { instrumentKey: string; symbol: string } => i !== null);

  const [upstox, massive, yahoo, stooq] = await Promise.all([
    timed(() =>
      upstoxInstruments.length
        ? fetchUpstoxQuotes(upstoxInstruments).catch(() => [])
        : Promise.resolve([]),
    ),
    timed(() => fetchMassiveUsQuotes(symbols).catch(() => [])),
    timed(() => fetchYahooQuotes(symbols).catch(() => [])),
    timed(() => fetchStooqQuotes(symbols).catch(() => [])),
  ]);

  // Merge: later sources override earlier ones (official-first priority).
  const merged = new Map<string, LiveQuote>();
  for (const q of stooq.value ?? []) merged.set(q.symbol, q);
  for (const q of yahoo.value ?? []) merged.set(q.symbol, q);
  for (const q of massive.value ?? []) merged.set(q.symbol, q);
  for (const q of upstox.value ?? []) merged.set(q.symbol, q);

  const fresh: LiveQuote[] = [];
  const missing: string[] = [];
  for (const s of symbols) {
    const q = merged.get(s);
    if (q && Number.isFinite(q.price) && q.price > 0) fresh.push(q);
    else missing.push(s);
  }

  // Persist fresh quotes as last-good (throttled, single batched upsert).
  if (fresh.length) void persistLastGoodThrottled(fresh);

  // Backfill from persisted last-good — real delayed data, labeled stale.
  const staleBySymbol = new Map<string, LiveQuote>();
  if (missing.length) {
    const lg = await readLastGood(missing).catch(() => new Map<string, LiveQuote>());
    for (const [s, q] of lg) staleBySymbol.set(s, { ...q, stale: true });
  }

  const quotes: QuoteResult[] = [
    ...fresh.map((quote) => ({ quote, stale: false })),
    ...[...staleBySymbol.values()].map((quote) => ({ quote, stale: true })),
  ];

  const sources: QuoteSourceStatus[] = [
    status("upstox", upstox, (upstox.value ?? []).length),
    status("massive", massive, (massive.value ?? []).length),
    status("yahoo", yahoo, (yahoo.value ?? []).length),
    status("stooq", stooq, (stooq.value ?? []).length),
    {
      id: "last-good",
      ok: true,
      latencyMs: 0,
      count: staleBySymbol.size,
    },
  ];
  if (!hasMassiveApiKey()) {
    const m = sources.find((s) => s.id === "massive")!;
    m.ok = false;
    m.error = "MASSIVE_API_KEY not set — Yahoo carries US tape";
  }

  return { quotes, sources };
}

/** Read persisted last-good quotes for symbols. Never invents: only real rows. */
export async function readLastGood(symbols: string[]): Promise<Map<string, LiveQuote>> {
  const out = new Map<string, LiveQuote>();
  if (!symbols.length || !hasDatabase()) return out;
  await ensureSchema().catch(() => {});
  const db = sql();
  const rows = (await db`
    SELECT symbol, price, change, change_pct, currency, provider, captured_at
    FROM quote_last_good
    WHERE symbol = ANY(${symbols})
  `) as {
    symbol: string;
    price: number;
    change: number;
    change_pct: number;
    currency: string | null;
    provider: string;
    captured_at: Date;
  }[];
  for (const r of rows) {
    out.set(r.symbol, {
      symbol: r.symbol,
      price: r.price,
      change: r.change,
      changePct: r.change_pct,
      currency: r.currency ?? undefined,
      asOf:
        r.captured_at instanceof Date
          ? r.captured_at.toISOString()
          : new Date(r.captured_at).toISOString(),
      provider: r.provider as LiveQuote["provider"],
      stale: true,
    });
  }
  return out;
}

/** Throttled write-through of fresh quotes (one batched upsert per minute max). */
async function persistLastGoodThrottled(quotes: LiveQuote[]): Promise<void> {
  const now = Date.now();
  if (now - lastPersistAt < LAST_GOOD_WRITE_THROTTLE_MS) return;
  lastPersistAt = now;
  if (!hasDatabase()) return;
  try {
    await ensureSchema();
    const db = sql();
    const symbols = quotes.map((q) => q.symbol);
    const prices = quotes.map((q) => q.price);
    const changes = quotes.map((q) => q.change);
    const changePcts = quotes.map((q) => q.changePct);
    const currencies = quotes.map((q) => q.currency ?? null);
    const providers = quotes.map((q) => q.provider);
    await db`
      INSERT INTO quote_last_good (symbol, price, change, change_pct, currency, provider, captured_at)
      SELECT u.symbol, u.price, u.change, u.change_pct, u.currency, u.provider, now()
      FROM unnest(
        ${symbols}::text[], ${prices}::float8[], ${changes}::float8[],
        ${changePcts}::float8[], ${currencies}::text[], ${providers}::text[]
      ) AS u(symbol, price, change, change_pct, currency, provider)
      ON CONFLICT (symbol) DO UPDATE SET
        price = EXCLUDED.price,
        change = EXCLUDED.change,
        change_pct = EXCLUDED.change_pct,
        currency = EXCLUDED.currency,
        provider = EXCLUDED.provider,
        captured_at = EXCLUDED.captured_at
    `;
  } catch {
    /* last-good is best-effort — live quotes already succeeded */
  }
}

/** Clear in-memory state (tests). */
export function __resetQuoteServiceForTests(): void {
  cache.clear();
  inflight.clear();
  lastPersistAt = 0;
}
