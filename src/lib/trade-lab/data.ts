import { feedFetch, type FeedFetchInit } from "@/lib/feeds/http";
import { findIndiaInstrument, INDIA_INDEX_INSTRUMENT_KEYS } from "@/lib/feeds/india/instruments";
import { fetchUpstoxHistoricalCandles, fetchUpstoxIntradayCandles } from "@/lib/feeds/sources/upstox";
import { findFoInstrument } from "@/lib/options-flow/fo-universe";
import type { Bar } from "@/lib/scanner/types";
import type { Timeframe } from "./types";

export interface Instrument {
  id: string;
  label: string;
  yahoo: string;
  kind: "index" | "stock";
}

/** Index cards on the picker. Yahoo tickers verified live. */
export const INDEX_INSTRUMENTS: Instrument[] = [
  { id: "NIFTY", label: "NIFTY 50", yahoo: "^NSEI", kind: "index" },
  { id: "BANKNIFTY", label: "NIFTY BANK", yahoo: "^NSEBANK", kind: "index" },
  { id: "SENSEX", label: "SENSEX", yahoo: "^BSESN", kind: "index" },
  { id: "BANKEX", label: "BANKEX", yahoo: "BSE-BANK.BO", kind: "index" },
  { id: "INDIAVIX", label: "INDIA VIX", yahoo: "^INDIAVIX", kind: "index" },
];

const INDEX_ALIASES: Record<string, string> = {
  "NIFTY 50": "NIFTY", NIFTY50: "NIFTY", "NIFTY BANK": "BANKNIFTY", "BANK NIFTY": "BANKNIFTY", "INDIA VIX": "INDIAVIX",
};

/** Resolve a user symbol (index id/label or any NSE/BSE ticker) to a Yahoo ticker. Returns null for obviously invalid input. */
export function resolveInstrument(raw: string): Instrument | null {
  const s = raw.trim().toUpperCase();
  if (!s || s.length > 24 || !/^[A-Z0-9&.\-^ ]+$/.test(s)) return null;
  const idx = INDEX_INSTRUMENTS.find((i) => i.id === (INDEX_ALIASES[s] ?? s) || i.label === s);
  if (idx) return idx;
  if (s.startsWith("^") || s.endsWith(".NS") || s.endsWith(".BO")) return { id: s, label: s, yahoo: s, kind: "stock" };
  const bare = s.replace(/\s+/g, "");
  return { id: bare, label: bare, yahoo: `${bare}.NS`, kind: "stock" };
}

const TF_PARAMS: Record<Timeframe, { interval: string; range: string }> = {
  "5m": { interval: "5m", range: "1mo" },
  "15m": { interval: "15m", range: "1mo" },
  "1h": { interval: "60m", range: "6mo" },
  "1d": { interval: "1d", range: "2y" },
  "1wk": { interval: "1wk", range: "10y" },
  "1mo": { interval: "1mo", range: "max" },
};

export interface BarsResult {
  bars: Bar[];
  source: string;
  hasVolume: boolean;
}

/** OHLCV from Yahoo's chart endpoint (split-adjusted, not dividend-adjusted). Returns null if no usable data — never fabricates. */
export async function fetchYahooBars(yahooTicker: string, tf: Timeframe, range?: string, options?: Pick<FeedFetchInit, "timeoutMs" | "attempts" | "signal">): Promise<BarsResult | null> {
  const p = TF_PARAMS[tf];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=${p.interval}&range=${range ?? p.range}`;
  try {
    const res = await feedFetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MarketIntelligenceBot/1.0)", Accept: "application/json" },
      timeoutMs: options?.timeoutMs ?? 15_000,
      attempts: options?.attempts,
      signal: options?.signal,
      next: { revalidate: tf.endsWith("m") || tf === "1h" ? 60 : 600 },
    } as RequestInit & { timeoutMs?: number });
    if (!res.ok) return null;
    const j = await res.json();
    const r = j?.chart?.result?.[0];
    const q = r?.indicators?.quote?.[0];
    if (!r?.timestamp || !q) return null;
    const bars: Bar[] = [];
    for (let i = 0; i < r.timestamp.length; i++) {
      const o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i], v = q.volume[i];
      if ([o, h, l, c].some((x) => typeof x !== "number" || !Number.isFinite(x))) continue;
      if (!v && h === l) continue; // Yahoo placeholder bar
      bars.push({ t: r.timestamp[i], o, h, l, c, v: typeof v === "number" ? v : 0 });
    }
    if (bars.length < 30) return null;
    return { bars, source: "Yahoo Finance", hasVolume: bars.some((b) => b.v > 0) };
  } catch {
    return null;
  }
}

const UPSTOX_INDEX_KEYS: Record<string, string> = {
  NIFTY: INDIA_INDEX_INSTRUMENT_KEYS.NIFTY,
  BANKNIFTY: INDIA_INDEX_INSTRUMENT_KEYS.BANKNIFTY,
  SENSEX: "BSE_INDEX|SENSEX",
  BANKEX: "BSE_INDEX|BANKEX",
  INDIAVIX: "NSE_INDEX|India VIX",
};

async function upstoxKeyFor(inst: Instrument): Promise<string | null> {
  if (UPSTOX_INDEX_KEYS[inst.id]) return UPSTOX_INDEX_KEYS[inst.id];
  if (inst.kind !== "stock") return null;
  const fo = await findFoInstrument(inst.id).catch(() => null);
  return fo?.instrumentKey ?? findIndiaInstrument(inst.id)?.instrumentKey ?? null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86_400_000));

/** Upstox exchange candles (free analytics token). Returns null when the token is missing, the key is unknown, or nothing comes back. */
export async function fetchUpstoxBars(inst: Instrument, tf: Timeframe): Promise<BarsResult | null> {
  if (!process.env.UPSTOX_ACCESS_TOKEN) return null;
  try {
    const key = await upstoxKeyFor(inst);
    if (!key) return null;
    const to = iso(new Date());
    let candles =
      tf === "5m" ? await fetchUpstoxHistoricalCandles(key, "minutes", "5", daysAgo(30), to)
      : tf === "15m" ? await fetchUpstoxHistoricalCandles(key, "minutes", "15", daysAgo(30), to)
      : tf === "1h" ? await fetchUpstoxHistoricalCandles(key, "hours", "1", daysAgo(90), to)
      : tf === "1d" ? await fetchUpstoxHistoricalCandles(key, "days", "1", daysAgo(740), to)
      : tf === "1wk" ? await fetchUpstoxHistoricalCandles(key, "weeks", "1", daysAgo(3650), to)
      : await fetchUpstoxHistoricalCandles(key, "months", "1", daysAgo(3650), to);
    // Historical endpoint can lag the live session — append today's intraday candles for minute frames.
    if (tf === "5m" || tf === "15m") {
      const today = await fetchUpstoxIntradayCandles(key, tf === "5m" ? "5" : "15").catch(() => []);
      const seen = new Set(candles.map((c) => c.ts));
      candles = [...candles, ...today.filter((c) => !seen.has(c.ts))].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
    }
    const bars: Bar[] = candles
      .map((c) => ({ t: Math.floor(Date.parse(c.ts) / 1000), o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume }))
      .filter((b) => [b.t, b.o, b.h, b.l, b.c].every(Number.isFinite) && !(b.v === 0 && b.h === b.l));
    if (bars.length < 30) return null;
    return { bars, source: "Upstox (NSE/BSE)", hasVolume: bars.some((b) => b.v > 0) };
  } catch {
    return null;
  }
}

/**
 * Source ladder: Upstox exchange candles first, Yahoo Finance second. Both are free.
 * Returns null only when every source fails — callers then fall back to the last-good cache, never to invented data.
 */
export async function fetchBars(inst: Instrument, tf: Timeframe, range?: string, options?: Pick<FeedFetchInit, "timeoutMs" | "attempts" | "signal">): Promise<BarsResult | null> {
  if (!range) {
    const up = await fetchUpstoxBars(inst, tf);
    if (up) return up;
  }
  return fetchYahooBars(inst.yahoo, tf, range, options);
}
