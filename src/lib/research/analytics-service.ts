/**
 * Research analytics service (Phase 1).
 *
 * Orchestrates the four Phase 1 analytics workstreams — Financial X-Ray,
 * Financial DNA, Red Flags, Historical Valuation — over normalized financial
 * statements plus Yahoo price history. One workstream failing must never kill
 * the others: each builder runs inside its own try/catch and degrades to null
 * for its section (honest "unavailable" rather than fabricated data).
 */
import { getCompanyFinancials } from "@/lib/financials/service";
import { feedFetch } from "@/lib/feeds/http";
import {
  fetchYahooCandles,
  yahooTickerForIndiaSymbol,
} from "@/lib/feeds/sources/yahoo-candles";
import type {
  CompanyResearchAnalytics,
  MetricSource,
} from "./analytics-types";
import { normalizeFinancials } from "./analytics-normalize";
import { buildXRay } from "./xray";
import { scoreDNA } from "./financial-dna";
import { detectRedFlags } from "./red-flags";
import { buildValuationHistory } from "./valuation-history";

const SYMBOL_RE = /^[A-Z0-9&.\-]{1,20}$/;

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; MarketIntelligenceBot/1.0)",
  Accept: "application/json",
};

const NSE_SOURCE: MetricSource = {
  provider: "NSE India",
  sourceType: "exchange",
  sourceUrl: "https://www.nseindia.com",
  retrievedAt: new Date().toISOString(),
};

const YAHOO_SOURCE: MetricSource = {
  provider: "Yahoo Finance",
  sourceType: "market_data",
  sourceUrl: "https://query1.finance.yahoo.com",
  retrievedAt: new Date().toISOString(),
};

type PricePoint = { date: string; close: number };

/**
 * Load up to ~10 years of weekly closes for valuation bands.
 *
 * DELIBERATE, DOCUMENTED DEVIATION: `fetchYahooCandles` caps CandleRange at
 * "1Y", but 10-year historical valuation bands need decade-long prices. This
 * calls the same Yahoo chart API (query1.finance.yahoo.com v8 chart endpoint)
 * through the same `feedFetch` helper and headers that `fetchYahooCandles`
 * uses — same provider, same fetch pattern, no new dependency. Failures are
 * non-fatal: the caller falls back to the 1Y daily candles.
 */
async function fetchDecadeWeeklyCloses(ticker: string): Promise<PricePoint[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1wk&range=10y`;
  const res = await feedFetch(url, { headers: YAHOO_HEADERS, timeoutMs: 12_000 });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    chart?: {
      result?: {
        timestamp?: number[];
        indicators?: { quote?: { close?: (number | null)[] }[] };
      }[];
    };
  };
  const result = json?.chart?.result?.[0];
  const stamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const out: PricePoint[] = [];
  for (let i = 0; i < stamps.length; i += 1) {
    const close = closes[i];
    if (typeof close !== "number" || !Number.isFinite(close)) continue;
    out.push({ date: new Date(stamps[i]! * 1000).toISOString().slice(0, 10), close });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * Price history for valuation: recent daily closes (1Y) merged with the
 * decade-long weekly series. Dedupes by calendar date, preferring the higher-
 * resolution daily close. Never throws — returns [] on total failure so the
 * valuation builder can report insufficient history honestly.
 */
async function loadPriceHistory(symbol: string): Promise<PricePoint[]> {
  const ticker = yahooTickerForIndiaSymbol(symbol, symbol);

  let daily: PricePoint[] = [];
  try {
    const candles = await fetchYahooCandles(ticker, "1Y");
    daily = candles.map((c) => ({
      date: new Date(c.ts).toISOString().slice(0, 10),
      close: c.close,
    }));
  } catch {
    console.warn(`[research-analytics] Yahoo 1Y daily fetch failed for ${symbol}`);
  }

  let decade: PricePoint[] = [];
  try {
    decade = await fetchDecadeWeeklyCloses(ticker);
  } catch {
    console.warn(`[research-analytics] Yahoo 10y weekly fetch failed for ${symbol}`);
  }

  const byDate = new Map<string, number>();
  for (const p of decade) byDate.set(p.date, p.close); // weekly baseline
  for (const p of daily) byDate.set(p.date, p.close); // daily wins on overlap
  return [...byDate.entries()]
    .map(([date, close]) => ({ date, close }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * Assemble the four Phase 1 analytics sections for a company symbol.
 * Returns null when the symbol is invalid, has no financial statements
 * (covers US/unknown symbols), or yields no usable periods.
 */
export async function getResearchAnalytics(
  symbol: string,
): Promise<CompanyResearchAnalytics | null> {
  const sym = symbol.trim().toUpperCase();
  if (!SYMBOL_RE.test(sym)) return null;

  let payload: Awaited<ReturnType<typeof getCompanyFinancials>>;
  try {
    payload = await getCompanyFinancials(sym);
  } catch (e) {
    console.warn(
      `[research-analytics] financials fetch failed for ${sym}:`,
      e instanceof Error ? e.message : e,
    );
    return null;
  }
  if (!payload) return null;

  const { periods, companyType } = normalizeFinancials(payload);
  if (!periods.length) return null;

  const priceHistory = await loadPriceHistory(sym);

  // Each workstream is isolated: a failing builder nulls its own section only.
  let financialXRay: CompanyResearchAnalytics["financialXRay"] = null;
  try {
    financialXRay = buildXRay(periods, companyType);
  } catch (e) {
    console.warn(
      `[research-analytics] buildXRay failed for ${sym}:`,
      e instanceof Error ? e.message : e,
    );
  }

  let financialDNA: CompanyResearchAnalytics["financialDNA"] = null;
  try {
    financialDNA = scoreDNA(periods, companyType);
  } catch (e) {
    console.warn(
      `[research-analytics] scoreDNA failed for ${sym}:`,
      e instanceof Error ? e.message : e,
    );
  }

  let redFlags: CompanyResearchAnalytics["redFlags"] = null;
  try {
    redFlags = detectRedFlags(periods, companyType);
  } catch (e) {
    console.warn(
      `[research-analytics] detectRedFlags failed for ${sym}:`,
      e instanceof Error ? e.message : e,
    );
  }

  let historicalValuation: CompanyResearchAnalytics["historicalValuation"] = null;
  try {
    historicalValuation = buildValuationHistory(periods, priceHistory, companyType);
  } catch (e) {
    console.warn(
      `[research-analytics] buildValuationHistory failed for ${sym}:`,
      e instanceof Error ? e.message : e,
    );
  }

  const latest = periods[periods.length - 1];
  return {
    symbol: sym,
    generatedAt: new Date().toISOString(),
    companyType,
    financialXRay,
    financialDNA,
    redFlags,
    historicalValuation,
    provenance: {
      financialsAsOf: latest?.label ?? null,
      sources: [NSE_SOURCE, YAHOO_SOURCE],
    },
  };
}
