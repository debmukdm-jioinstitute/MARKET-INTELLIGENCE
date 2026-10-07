import { feedFetch } from "@/lib/feeds/http";
import INDUSTRY_MAP from "./industry-map.json";

/**
 * Industry / sector for any listed NSE stock, from Yahoo's keyless search endpoint
 * (e.g. PYRAMID.NS -> "Packaging & Containers"). Lets the 2,000+ NSE names outside the Nifty 500
 * resolve to business lines too. Cached 24h; failures are cached 30 min so a bad symbol cannot hammer Yahoo.
 */

export type StockProfile = { industry: string | null; sector: string | null };

const OK_TTL = 24 * 3600_000;
const FAIL_TTL = 30 * 60_000;
const cache = new Map<string, { at: number; ttl: number; value: StockProfile | null }>();
const inflight = new Map<string, Promise<StockProfile | null>>();

const UA = "Mozilla/5.0"; // Yahoo 429s full browser user agents on this endpoint; the bare token is accepted

type Quote = { symbol?: string; quoteType?: string; sector?: string; industry?: string };

/** Pick the NSE listing of this symbol from a Yahoo search response, if any. */
export function pickProfile(quotes: Quote[], symbol: string): StockProfile | null {
  const want = `${symbol.toUpperCase()}.NS`;
  const q = quotes.find((x) => x.symbol?.toUpperCase() === want && x.quoteType === "EQUITY") ?? quotes.find((x) => x.symbol?.toUpperCase() === `${symbol.toUpperCase()}.BO` && x.quoteType === "EQUITY");
  if (!q || (!q.industry && !q.sector)) return null;
  return { industry: q.industry ?? null, sector: q.sector ?? null };
}

async function load(symbol: string): Promise<StockProfile | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=6&newsCount=0`;
    const res = await feedFetch(url, { headers: { "User-Agent": UA }, timeoutMs: 4_000, attempts: 1 });
    if (res.status === 429) pausedUntil = Date.now() + 5 * 60_000;
    if (!res.ok) return null;
    const json = (await res.json()) as { quotes?: Quote[] };
    return pickProfile(json.quotes ?? [], symbol);
  } catch {
    return null;
  }
}

/** Global politeness: Yahoo throttles unauthenticated bursts, so live lookups are spaced and pause after a 429. */
let nextSlot = 0;
let pausedUntil = 0;
const MIN_GAP_MS = 1_200;

const STATIC = INDUSTRY_MAP as unknown as Record<string, [string, string] | null>;

export function fetchStockProfile(symbol: string): Promise<StockProfile | null> {
  const key = symbol.toUpperCase();
  const known = STATIC[key];
  if (known) return Promise.resolve({ industry: known[0] || null, sector: known[1] || null });
  if (key in STATIC) return Promise.resolve(null); // looked up before: Yahoo has nothing
  if (Date.now() < pausedUntil) return Promise.resolve(null);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return Promise.resolve(hit.value);
  const running = inflight.get(key);
  if (running) return running;
  const wait = Math.max(0, nextSlot - Date.now());
  nextSlot = Date.now() + wait + MIN_GAP_MS;
  const p = (wait > 8_000 ? Promise.resolve(null) : new Promise((r) => setTimeout(r, wait)).then(() => load(key)))
    .then((value) => {
      cache.set(key, { at: Date.now(), ttl: value ? OK_TTL : FAIL_TTL, value });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
