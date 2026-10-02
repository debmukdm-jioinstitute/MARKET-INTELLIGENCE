import { feedFetch } from "@/lib/feeds/http";
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
export async function fetchBars(yahooTicker: string, tf: Timeframe, range?: string): Promise<BarsResult | null> {
  const p = TF_PARAMS[tf];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=${p.interval}&range=${range ?? p.range}`;
  try {
    const res = await feedFetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MarketIntelligenceBot/1.0)", Accept: "application/json" },
      timeoutMs: 15_000,
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
