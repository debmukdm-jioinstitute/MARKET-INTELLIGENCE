import { feedFetch } from "@/lib/feeds/http";
import { INDIA_INSTRUMENT_KEYS } from "@/lib/feeds/sources/upstox";
import { isUsEquityTicker } from "@/lib/feeds/sources/massive";
import { fetchYahooEarningsDate } from "@/lib/feeds/sources/yahoo-calendar";

/**
 * Per-security risk & events card. Everything is computed from ~1y of daily Yahoo bars:
 *  realized vol (annualised sd of daily log returns), ATR(14) (Wilder), max drawdown, beta vs the local benchmark,
 *  position in the 52-week range. Plus next earnings date (India, Yahoo) and recent Form 4 insider filings (US, SEC EDGAR).
 * Deliberately NO buy/hold/sell rating or price target: those would be advice, and the inputs don't support them.
 */

type Bar = { date: string; o: number; h: number; l: number; c: number };

const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; MarketIntelligenceBot/1.0)", Accept: "application/json" };

async function bars(symbol: string): Promise<Bar[]> {
  const res = await feedFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`, { headers: HEADERS, timeoutMs: 12_000 });
  if (!res.ok) return [];
  const j = (await res.json()) as { chart?: { result?: { timestamp?: number[]; indicators?: { quote?: { open: (number | null)[]; high: (number | null)[]; low: (number | null)[]; close: (number | null)[] }[] } }[] } };
  const r = j.chart?.result?.[0];
  const q = r?.indicators?.quote?.[0];
  if (!r?.timestamp || !q) return [];
  const out: Bar[] = [];
  r.timestamp.forEach((t, i) => {
    const [o, h, l, c] = [q.open[i], q.high[i], q.low[i], q.close[i]];
    if (o != null && h != null && l != null && c != null && c > 0) out.push({ date: new Date(t * 1000).toISOString().slice(0, 10), o, h, l, c });
  });
  return out;
}

export type InsiderFiling = { date: string; form: string; url: string };

export type SecurityRisk = {
  symbol: string;
  market: "IN" | "US";
  asOf: string;
  bars: number;
  realizedVolPct: number | null;
  atr14: number | null;
  atrPctOfPrice: number | null;
  maxDrawdownPct: number | null;
  beta: { value: number; benchmark: string; r2: number } | null;
  range52w: { low: number; high: number; positionPct: number } | null;
  nextEarnings: { date: string; isEstimate: boolean } | null;
  insiderFilings: InsiderFiling[] | null;
  insiderNote: string;
  method: string;
};

let cikMap: Map<string, string> | null = null;
async function cikFor(sym: string): Promise<string | null> {
  if (!cikMap) {
    const res = await feedFetch("https://www.sec.gov/files/company_tickers.json", { headers: { "User-Agent": process.env.FEED_USER_AGENT ?? "MarketIntelligence research@getmarketintelligence.vercel.app" }, timeoutMs: 12_000 });
    if (!res.ok) return null;
    const j = (await res.json()) as Record<string, { cik_str: number; ticker: string }>;
    cikMap = new Map(Object.values(j).map((r) => [r.ticker.toUpperCase(), String(r.cik_str).padStart(10, "0")]));
  }
  return cikMap.get(sym) ?? null;
}

async function form4(sym: string): Promise<InsiderFiling[] | null> {
  try {
    const cik = await cikFor(sym);
    if (!cik) return null;
    const res = await feedFetch(`https://data.sec.gov/submissions/CIK${cik}.json`, { headers: { "User-Agent": process.env.FEED_USER_AGENT ?? "MarketIntelligence research@getmarketintelligence.vercel.app" }, timeoutMs: 12_000 });
    if (!res.ok) return null;
    const j = (await res.json()) as { filings?: { recent?: { form: string[]; filingDate: string[]; accessionNumber: string[]; primaryDocument: string[] } } };
    const r = j.filings?.recent;
    if (!r) return null;
    const out: InsiderFiling[] = [];
    for (let i = 0; i < r.form.length && out.length < 8; i++) {
      if (r.form[i] === "4") {
        const acc = r.accessionNumber[i].replace(/-/g, "");
        out.push({ date: r.filingDate[i], form: "Form 4", url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${acc}/${r.primaryDocument[i]}` });
      }
    }
    return out;
  } catch {
    return null;
  }
}

const logRet = (b: Bar[]) => b.slice(1).map((x, i) => Math.log(x.c / b[i].c));
const sd = (a: number[]) => { const m = a.reduce((s, v) => s + v, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };

export async function buildSecurityRisk(symbol: string): Promise<SecurityRisk | null> {
  const sym = symbol.toUpperCase().replace(/\.NS$/, "");
  // Market detection: known NSE names or an explicit .NS suffix are Indian; otherwise try the bare (US) symbol first, then NSE.
  const knownIn = /\.NS$/i.test(symbol) || Boolean(INDIA_INSTRUMENT_KEYS[sym] || INDIA_INSTRUMENT_KEYS[`${sym}.NS`]);
  let us = !knownIn && isUsEquityTicker(sym);
  let b = await bars(us ? sym : `${sym}.NS`);
  if (b.length < 30 && us) { us = false; b = await bars(`${sym}.NS`); }
  const market = us ? "US" : "IN";
  const [bench, earnings, insiders] = await Promise.all([
    bars(us ? "^GSPC" : "^NSEI"),
    us ? Promise.resolve(null) : fetchYahooEarningsDate(sym).catch(() => null),
    us ? form4(sym) : Promise.resolve(null),
  ]);
  if (b.length < 30) return null;

  const rets = logRet(b);
  const vol = rets.length > 20 ? sd(rets) * Math.sqrt(252) * 100 : null;

  let atr: number | null = null;
  if (b.length > 15) {
    const tr = b.slice(1).map((x, i) => Math.max(x.h - x.l, Math.abs(x.h - b[i].c), Math.abs(x.l - b[i].c)));
    let a = tr.slice(0, 14).reduce((s, v) => s + v, 0) / 14;
    for (let i = 14; i < tr.length; i++) a = (a * 13 + tr[i]) / 14; // Wilder smoothing
    atr = a;
  }

  let peak = -Infinity, mdd = 0;
  for (const x of b) { peak = Math.max(peak, x.c); mdd = Math.min(mdd, x.c / peak - 1); }

  let beta: SecurityRisk["beta"] = null;
  const bm = new Map(bench.map((x, i) => [x.date, i > 0 ? Math.log(x.c / bench[i - 1].c) : NaN]));
  const xs: number[] = [], ys: number[] = [];
  b.slice(1).forEach((x, i) => { const r = bm.get(x.date); if (r != null && Number.isFinite(r)) { xs.push(r); ys.push(rets[i]); } });
  if (xs.length > 60) {
    const mx = xs.reduce((s, v) => s + v, 0) / xs.length, my = ys.reduce((s, v) => s + v, 0) / ys.length;
    let sxy = 0, sxx = 0, syy = 0;
    xs.forEach((v, i) => { sxy += (v - mx) * (ys[i] - my); sxx += (v - mx) ** 2; syy += (ys[i] - my) ** 2; });
    if (sxx > 0 && syy > 0) beta = { value: sxy / sxx, benchmark: us ? "S&P 500" : "NIFTY 50", r2: (sxy * sxy) / (sxx * syy) };
  }

  const last = b[b.length - 1].c;
  const hi = Math.max(...b.map((x) => x.h)), lo = Math.min(...b.map((x) => x.l));
  return {
    symbol: sym,
    market,
    asOf: b[b.length - 1].date,
    bars: b.length,
    realizedVolPct: vol,
    atr14: atr,
    atrPctOfPrice: atr != null ? (atr / last) * 100 : null,
    maxDrawdownPct: mdd * 100,
    beta,
    range52w: { low: lo, high: hi, positionPct: hi > lo ? ((last - lo) / (hi - lo)) * 100 : 50 },
    nextEarnings: earnings ? { date: earnings.date, isEstimate: earnings.isEstimate } : null,
    insiderFilings: insiders,
    insiderNote: us
      ? "Form 4 filings from SEC EDGAR (dates and documents only; transaction details are in the linked filing)."
      : "India insider/SAST disclosures are published on NSE and BSE, whose feeds block automated access — see the exchange disclosure pages.",
    method: "Daily bars, ~1 year (Yahoo Finance). Vol = annualised standard deviation of daily log returns; ATR = Wilder 14-day; drawdown measured on closes; beta = OLS slope of daily log returns vs the local benchmark. Descriptive statistics of the past, not forecasts.",
  };
}
