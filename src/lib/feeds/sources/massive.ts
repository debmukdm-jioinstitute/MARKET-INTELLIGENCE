import { feedFetch } from "@/lib/feeds/http";
import type { LiveQuote, MacroPoint } from "@/lib/feeds/types";

const DEFAULT_BASE = "https://api.massive.com";

export function massiveApiKey() {
  return (
    process.env.MASSIVE_API_KEY?.trim() ||
    process.env.POLYGON_API_KEY?.trim() ||
    process.env.Massive_Key?.trim() ||
    process.env.MASSIVE_KEY?.trim() ||
    ""
  );
}

export function hasMassiveApiKey() {
  return Boolean(massiveApiKey());
}

function baseUrl() {
  return (process.env.MASSIVE_API_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, "");
}

function docsUrl(path: string) {
  return `https://massive.com/docs${path}`;
}

/** Massive/Polygon epoch: trade times are ns; aggregate `t` is ms. */
function epochToIso(epoch: number) {
  const ms = epoch > 1e15 ? epoch / 1_000_000 : epoch;
  return new Date(ms).toISOString();
}

async function massiveGet<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const key = massiveApiKey();
  if (!key) return null;
  const url = new URL(`${baseUrl()}${path}`);
  url.searchParams.set("apiKey", key);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  const res = await feedFetch(url.toString(), { timeoutMs: 20_000 });
  if (res.status === 401) {
    throw new Error("Massive API unauthorized — check MASSIVE_API_KEY at https://massive.com/dashboard/keys");
  }
  if (res.status === 403 || res.status === 404 || res.status === 429) return null;
  if (!res.ok) throw new Error(`Massive HTTP ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

/** Yahoo / dashboard symbol → Massive index ticker (I:…) */
export const MASSIVE_INDEX_BY_SYMBOL: Record<string, string> = {
  "^GSPC": "I:SPX",
  "^IXIC": "I:COMP",
  "^DJI": "I:DJI",
  "^VIX": "I:VIX",
};

const MASSIVE_INDEX_TO_SYMBOL = Object.fromEntries(
  Object.entries(MASSIVE_INDEX_BY_SYMBOL).map(([k, v]) => [v, k]),
) as Record<string, string>;

type StockSnapshotTicker = {
  ticker?: string;
  todaysChange?: number;
  todaysChangePerc?: number;
  updated?: number;
  day?: { c?: number };
  prevDay?: { c?: number };
  lastTrade?: { p?: number; t?: number };
};

type StockSnapshotResponse = {
  status?: string;
  tickers?: StockSnapshotTicker[];
};

type IndexSnapshotResult = {
  ticker?: string;
  value?: number;
  last_updated?: number;
  session?: {
    change?: number;
    change_percent?: number;
    close?: number;
    previous_close?: number;
  };
  error?: string;
};

type IndexSnapshotResponse = {
  status?: string;
  results?: IndexSnapshotResult[];
};

type AggsResponse = {
  status?: string;
  results?: { t: number; c: number }[];
};

function snapshotToQuote(
  symbol: string,
  price: number,
  change: number,
  changePct: number,
  asOfMs?: number,
): LiveQuote {
  return {
    symbol,
    price,
    change,
    changePct: changePct / 100,
    currency: "USD",
    asOf: asOfMs != null ? epochToIso(asOfMs) : new Date().toISOString(),
    provider: "massive",
  };
}

export function isUsEquityTicker(symbol: string) {
  if (symbol.includes("=") || symbol.includes("^") || symbol.includes(".")) return false;
  return /^[A-Z][A-Z0-9.-]{0,9}$/i.test(symbol);
}

async function fetchMassiveLastTwoCloses(
  ticker: string,
): Promise<{ price: number; prev: number; asOf: number } | null> {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 21);
  const json = await massiveGet<AggsResponse>(
    `/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${from.toISOString().slice(0, 10)}/${to.toISOString().slice(0, 10)}`,
    { adjusted: "true", sort: "desc", limit: "2" },
  );
  const rows = json?.results ?? [];
  if (!rows.length) return null;
  const latest = rows[0];
  const prevClose = rows[1]?.c ?? latest.c;
  return { price: latest.c, prev: prevClose, asOf: latest.t };
}

function quoteFromCloses(symbol: string, price: number, prev: number, asOfMs: number): LiveQuote {
  const change = price - prev;
  const changePct = prev ? (change / prev) * 100 : 0;
  return snapshotToQuote(symbol, price, change, changePct, asOfMs);
}

export async function fetchMassiveStockSnapshots(
  symbols: string[],
  opts?: { aggFallback?: boolean },
): Promise<LiveQuote[]> {
  if (!hasMassiveApiKey()) return [];
  const tickers = [...new Set(symbols.filter(isUsEquityTicker).map((s) => s.toUpperCase()))];
  if (!tickers.length) return [];

  const out: LiveQuote[] = [];
  const chunk = 50;
  for (let i = 0; i < tickers.length; i += chunk) {
    const slice = tickers.slice(i, i + chunk);
    const json = await massiveGet<StockSnapshotResponse>(
      "/v2/snapshot/locale/us/markets/stocks/tickers",
      { tickers: slice.join(",") },
    );
    for (const row of json?.tickers ?? []) {
      const sym = row.ticker;
      if (!sym) continue;
      const price = row.lastTrade?.p ?? row.day?.c ?? row.prevDay?.c;
      if (price == null) continue;
      const change = row.todaysChange ?? price - (row.prevDay?.c ?? price);
      const changePct = row.todaysChangePerc ?? 0;
      const asOf = row.lastTrade?.t ?? row.updated;
      out.push(snapshotToQuote(sym, price, change, changePct, asOf));
    }
    if (opts?.aggFallback) {
      const got = new Set(out.map((q) => q.symbol));
      const missing = slice.filter((sym) => !got.has(sym));
      for (const sym of missing) {
        const bars = await fetchMassiveLastTwoCloses(sym);
        if (bars) out.push(quoteFromCloses(sym, bars.price, bars.prev, bars.asOf));
      }
    }
  }
  return out;
}

export async function fetchMassiveIndexSnapshots(
  yahooSymbols: string[],
  opts?: { aggFallback?: boolean },
): Promise<LiveQuote[]> {
  if (!hasMassiveApiKey()) return [];
  const indexTickers = yahooSymbols
    .map((s) => MASSIVE_INDEX_BY_SYMBOL[s])
    .filter(Boolean) as string[];
  if (!indexTickers.length) return [];

  const json = await massiveGet<IndexSnapshotResponse>("/v3/snapshot/indices", {
    "ticker.any_of": indexTickers.join(","),
  });

  const out: LiveQuote[] = [];
  for (const row of json?.results ?? []) {
    if (row.error || !row.ticker) continue;
    const yahooSym = MASSIVE_INDEX_TO_SYMBOL[row.ticker];
    if (!yahooSym) continue;
    const price = row.value ?? row.session?.close;
    if (price == null) continue;
    const prev = row.session?.previous_close ?? price;
    const change = row.session?.change ?? price - prev;
    const changePct = row.session?.change_percent ?? (prev ? ((price - prev) / prev) * 100 : 0);
    out.push(snapshotToQuote(yahooSym, price, change, changePct, row.last_updated));
  }
  if (opts?.aggFallback) {
    for (const idx of indexTickers) {
      const yahooSym = MASSIVE_INDEX_TO_SYMBOL[idx];
      if (!yahooSym || out.some((q) => q.symbol === yahooSym)) continue;
      const bars = await fetchMassiveLastTwoCloses(idx);
      if (bars) out.push(quoteFromCloses(yahooSym, bars.price, bars.prev, bars.asOf));
    }
  }
  return out;
}

/** US tape: Massive stocks + indices; non-US symbols omitted (caller merges Yahoo). */
export async function fetchMassiveUsQuotes(symbols: string[]): Promise<LiveQuote[]> {
  const indexSyms = symbols.filter((s) => MASSIVE_INDEX_BY_SYMBOL[s]);
  const stockSyms = symbols.filter((s) => !MASSIVE_INDEX_BY_SYMBOL[s]);
  const [stocks, indices] = await Promise.all([
    fetchMassiveStockSnapshots(stockSyms),
    fetchMassiveIndexSnapshots(indexSyms),
  ]);
  return [...stocks, ...indices];
}

export async function fetchMassiveDailyBars(symbol: string, days = 365): Promise<MacroPoint[]> {
  if (!hasMassiveApiKey() || !isUsEquityTicker(symbol)) return [];
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);
  const ticker = symbol.toUpperCase();
  const json = await massiveGet<AggsResponse>(
    `/v2/aggs/ticker/${ticker}/range/1/day/${fromStr}/${toStr}`,
    { adjusted: "true", sort: "asc", limit: "500" },
  );
  return (json?.results ?? []).map((r) => ({
    date: new Date(r.t).toISOString().slice(0, 10),
    value: r.c,
  }));
}

export async function fetchMassiveMarketStatus() {
  if (!hasMassiveApiKey()) return null;
  return massiveGet<{ market?: string; serverTime?: string; exchanges?: Record<string, string> }>(
    "/v1/marketstatus/now",
  );
}

export const MASSIVE_SOURCE = {
  provider: "Massive",
  url: "https://massive.com/docs/llms.txt",
};

export function massiveTickerOverviewUrl(ticker: string) {
  return docsUrl(`/rest/stocks/tickers/ticker-overview?ticker=${encodeURIComponent(ticker)}`);
}
