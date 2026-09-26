import { feedFetch } from "@/lib/feeds/http";
import {
  ALL_MODEL_FIELDS,
  FIELD_MAP,
  INDEX_BY_SUFFIX,
  MINOR_UNITS,
  REVENUE_TIMESERIES_KEYS,
  TTM_TYPES,
} from "@/lib/models/field-map";
import { countryDefaults, sovereignDefaultSpread } from "@/lib/models/country";
import { fetchPeerSet } from "@/lib/models/peers";
import { reconcileOperatingIncome } from "@/lib/models/reconcile";
import type { CompanyProfile, FieldKey, FinancialDataset, FiscalPeriod, MarketSnapshot, PriceSeries, TtmFigures } from "@/lib/models/types";

const HEADERS = { "User-Agent": "Mozilla/5.0", Accept: "application/json" };
const BASE = "https://query2.finance.yahoo.com";

export class ProviderError extends Error {}

type YahooChartMeta = {
  symbol?: string;
  longName?: string;
  shortName?: string;
  currency?: string;
  regularMarketPrice?: number;
  regularMarketTime?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fullExchangeName?: string;
  exchangeName?: string;
};

type YahooChartResult = {
  meta: YahooChartMeta;
  timestamp?: number[];
  indicators?: {
    quote?: { close?: (number | null)[] }[];
    adjclose?: { adjclose?: (number | null)[] }[];
  };
};

type YahooTimeseriesValue = { asOfDate: string; currencyCode?: string; reportedValue?: { raw?: number } };
type YahooTimeseriesResult = { meta: { type: string[] }; [key: string]: unknown };

export async function getJson<T = unknown>(path: string, params: Record<string, string>, timeoutMs = 20_000): Promise<T> {
  const url = `${BASE}${path}?${new URLSearchParams(params).toString()}`;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await feedFetch(url, { headers: HEADERS, timeoutMs });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      if (res.status === 404) throw new ProviderError(`Yahoo Finance: not found (${path})`);
      if (!res.ok) throw new ProviderError(`Yahoo Finance HTTP ${res.status} (${path})`);
      return (await res.json()) as T;
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      lastErr = e;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw new ProviderError(`Yahoo Finance request failed: ${lastErr instanceof Error ? lastErr.message : lastErr}`);
}

export function indexForSymbol(symbol: string): { symbol: string; name: string } {
  const suffix = symbol.includes(".") ? symbol.split(".").pop()!.toUpperCase() : "";
  const found = INDEX_BY_SUFFIX[suffix] ?? INDEX_BY_SUFFIX[""];
  return { symbol: found[0], name: found[1] };
}

export async function fetchChart(symbol: string, range: string, interval: string): Promise<YahooChartResult> {
  const js = await getJson<{ chart?: { result?: YahooChartResult[]; error?: { description?: string } } }>(
    `/v8/finance/chart/${encodeURIComponent(symbol)}`,
    { range, interval, events: "div,splits", includeAdjustedClose: "true" },
  );
  const result = js?.chart?.result?.[0];
  if (!result) {
    const err = js?.chart?.error;
    throw new ProviderError(`Yahoo Finance chart error for ${symbol}: ${err?.description ?? "no data"}`);
  }
  return result;
}

export async function fetchMonthlySeries(symbol: string, name: string): Promise<PriceSeries> {
  const result = await fetchChart(symbol, "6y", "1mo");
  const stamps: number[] = result.timestamp ?? [];
  const adj: (number | null)[] | undefined = result.indicators?.adjclose?.[0]?.adjclose;
  const close: (number | null)[] | undefined = result.indicators?.quote?.[0]?.close;
  const series = adj && adj.some((v) => v != null) ? adj : close ?? [];

  const dates: string[] = [];
  const closes: number[] = [];
  const seenMonths = new Set<string>();
  for (let i = 0; i < stamps.length; i++) {
    const c = series[i];
    if (c == null) continue;
    const d = new Date(stamps[i] * 1000).toISOString().slice(0, 10);
    const month = d.slice(0, 7);
    if (seenMonths.has(month)) continue;
    seenMonths.add(month);
    dates.push(d);
    closes.push(c);
  }
  // drop the partial current month so returns are true month-over-month observations
  const currentMonth = new Date().toISOString().slice(0, 7);
  if (dates.length && dates[dates.length - 1].slice(0, 7) === currentMonth) {
    dates.pop();
    closes.pop();
  }
  if (dates.length < 13) throw new ProviderError(`Insufficient price history for ${symbol} (${dates.length} months)`);
  return { symbol, name, dates: dates.slice(-61), closes: closes.slice(-61) };
}

export function alignMonthly(stock: PriceSeries, index: PriceSeries): [PriceSeries, PriceSeries] {
  const byMonth = (s: PriceSeries) => {
    const m = new Map<string, [string, number]>();
    for (let i = 0; i < s.dates.length; i++) m.set(s.dates[i].slice(0, 7), [s.dates[i], s.closes[i]]);
    return m;
  };
  const a = byMonth(stock);
  const b = byMonth(index);
  const months = [...a.keys()].filter((m) => b.has(m)).sort();
  return [
    { symbol: stock.symbol, name: stock.name, dates: months.map((m) => a.get(m)![0]), closes: months.map((m) => a.get(m)![1]) },
    { symbol: index.symbol, name: index.name, dates: months.map((m) => b.get(m)![0]), closes: months.map((m) => b.get(m)![1]) },
  ];
}

async function fetchFundamentals(symbol: string): Promise<{ periods: FiscalPeriod[]; statementCurrency: string }> {
  const types = [...new Set(Object.values(FIELD_MAP).flat())].sort();
  const now = Math.floor(Date.now() / 1000);
  const js = await getJson<{ timeseries?: { result?: YahooTimeseriesResult[] } }>(
    `/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}`,
    {
      type: types.map((t) => "annual" + t).join(","),
      period1: String(now - 12 * 366 * 86400),
      period2: String(now + 86400),
      merge: "false",
    },
  );
  const results: YahooTimeseriesResult[] = js?.timeseries?.result ?? [];
  const byType = new Map<string, Map<string, number>>();
  const currencyVotes = new Map<string, number>();

  for (const res of results) {
    const t: string = res.meta?.type?.[0];
    if (!t) continue;
    const vals = new Map<string, number>();
    for (const v of (res[t] as YahooTimeseriesValue[] | undefined) ?? []) {
      const raw = v?.reportedValue?.raw;
      if (raw == null) continue;
      vals.set(v.asOfDate, Number(raw));
      if (v.currencyCode && (t.endsWith("TotalRevenue") || t.endsWith("TotalAssets") || t.endsWith("NetIncome"))) {
        currencyVotes.set(v.currencyCode, (currencyVotes.get(v.currencyCode) ?? 0) + 1);
      }
    }
    byType.set(t.replace(/^annual/, ""), vals);
  }

  const revenueDates = new Set<string>();
  for (const t of REVENUE_TIMESERIES_KEYS) for (const d of byType.get(t)?.keys() ?? []) revenueDates.add(d);
  const dates = [...revenueDates].sort();

  const periods: FiscalPeriod[] = [];
  for (const d of dates) {
    const fields: Partial<Record<FieldKey, number | null>> = {};
    for (const key of ALL_MODEL_FIELDS) {
      fields[key] = null;
      for (const candidate of FIELD_MAP[key]) {
        const v = byType.get(candidate)?.get(d);
        if (v !== undefined) {
          fields[key] = v;
          break;
        }
      }
    }
    if (fields.revenue == null || fields.total_assets == null) continue;
    periods.push({ periodEnd: d, fiscalYear: Number(d.slice(0, 4)), fields });
  }
  if (!periods.length) throw new ProviderError(`Yahoo Finance has no annual financial statements for ${symbol}`);

  let statementCurrency = "";
  let topVotes = 0;
  for (const [ccy, votes] of currencyVotes) if (votes > topVotes) { statementCurrency = ccy; topVotes = votes; }

  return { periods: periods.slice(-6), statementCurrency };
}

async function fetchRiskFreeRate(): Promise<{ rate: number | null; source: string }> {
  try {
    const result = await fetchChart("^TNX", "5d", "1d");
    const y = result.meta?.regularMarketPrice;
    if (y != null) return { rate: y / 100, source: "US 10-year Treasury yield (^TNX, Yahoo Finance)" };
  } catch {
    // fall through
  }
  return { rate: null, source: "" };
}

export async function fetchFxRate(fromCcy: string, toCcy: string): Promise<number | null> {
  if (fromCcy === toCcy) return 1;
  for (const [sym, invert] of [[`${fromCcy}${toCcy}=X`, false] as const, [`${toCcy}${fromCcy}=X`, true] as const]) {
    try {
      const result = await fetchChart(sym, "5d", "1d");
      const px = result.meta?.regularMarketPrice;
      if (px) return invert ? 1 / px : px;
    } catch {
      // try next
    }
  }
  return null;
}

/** Trailing-twelve-month figures (Yahoo "trailing" timeseries). Best-effort: returns null on any failure. */
async function fetchTtm(symbol: string): Promise<TtmFigures | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const types = Object.values(TTM_TYPES);
    const js = await getJson<{ timeseries?: { result?: YahooTimeseriesResult[] } }>(
      `/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}`,
      { type: types.map((t) => "trailing" + t).join(","), period1: String(now - 2 * 366 * 86400), period2: String(now + 86400), merge: "false" },
    );
    const out: TtmFigures = { revenue: null, ebitda: null, ebit: null, net_income: null };
    for (const res of js?.timeseries?.result ?? []) {
      const t = res.meta?.type?.[0];
      if (!t) continue;
      const series = ((res[t] as YahooTimeseriesValue[] | undefined) ?? []).filter((v) => v?.reportedValue?.raw != null);
      const latest = series.sort((a, b) => a.asOfDate.localeCompare(b.asOfDate)).pop();
      if (!latest) continue;
      for (const [key, name] of Object.entries(TTM_TYPES)) if (t === "trailing" + name) out[key as keyof TtmFigures] = Number(latest.reportedValue!.raw);
    }
    return Object.values(out).some((v) => v != null) ? out : null;
  } catch {
    return null;
  }
}

/** Sector / industry from Yahoo search (used to route financials to the residual-income model). */
async function fetchSector(symbol: string): Promise<{ sector: string | null; industry: string | null }> {
  try {
    const js = await getJson<{ quotes?: { symbol?: string; sectorDisp?: string; sector?: string; industryDisp?: string; industry?: string }[] }>(
      "/v1/finance/search",
      { q: symbol, quotesCount: "5", newsCount: "0" },
      8_000,
    );
    const q = js?.quotes?.find((x) => x.symbol?.toUpperCase() === symbol.toUpperCase()) ?? js?.quotes?.[0];
    return { sector: q?.sectorDisp ?? q?.sector ?? null, industry: q?.industryDisp ?? q?.industry ?? null };
  } catch {
    return { sector: null, industry: null };
  }
}

/** Resolves a bare symbol (e.g. "RELIANCE") to its Yahoo ticker, trying the NSE suffix as a fallback. */
async function resolveSymbol(input: string): Promise<{ symbol: string; chart: YahooChartResult }> {
  try {
    const chart = await fetchChart(input, "1y", "1d");
    return { symbol: input, chart };
  } catch (e) {
    // only fall back to the NSE suffix when Yahoo says the bare symbol does not exist — never mask rate limits / outages
    if (input.includes(".") || input.startsWith("^") || input.includes("=")) throw e;
    if (!(e instanceof ProviderError) || !/not found|no data/i.test(e.message)) throw e;
    const withSuffix = `${input}.NS`;
    const chart = await fetchChart(withSuffix, "1y", "1d");
    return { symbol: withSuffix, chart };
  }
}

const RF_FLOOR = 0.025;
const DATASET_TTL_MS = 30 * 60_000;
const datasetCache = new Map<string, { at: number; value: Promise<FinancialDataset> }>();

/**
 * Builds a complete FinancialDataset for a Yahoo-style ticker (free, no API key).
 * Results are cached in memory for 30 minutes (failures are not cached): a model page load, an export and
 * every recalculation would otherwise each fire ~25 Yahoo requests (statements, TTM, peers) and trip rate limits.
 */
export function fetchFinancialDataset(rawSymbol: string): Promise<FinancialDataset> {
  const key = rawSymbol.trim().toUpperCase();
  const hit = datasetCache.get(key);
  if (hit && Date.now() - hit.at < DATASET_TTL_MS) return hit.value;
  const value = buildFinancialDataset(rawSymbol);
  datasetCache.set(key, { at: Date.now(), value });
  value.catch(() => datasetCache.delete(key));
  return value;
}

async function buildFinancialDataset(rawSymbol: string): Promise<FinancialDataset> {
  const { symbol, chart } = await resolveSymbol(rawSymbol);
  const meta = chart.meta ?? {};
  const idx = indexForSymbol(symbol);

  const [{ periods, statementCurrency }, stockRaw, indexRaw, riskFree, ttm, sectorInfo] = await Promise.all([
    fetchFundamentals(symbol),
    fetchMonthlySeries(symbol, meta.longName ?? symbol),
    fetchMonthlySeries(idx.symbol, idx.name),
    fetchRiskFreeRate(),
    fetchTtm(symbol),
    fetchSector(symbol),
  ]);
  const [stockPrices, indexPrices] = alignMonthly(stockRaw, indexRaw);

  const notes: string[] = [];
  notes.push(...reconcileOperatingIncome(periods));
  const last = periods[periods.length - 1];
  const shares = last.fields.shares_outstanding ?? last.fields.diluted_shares;
  if (shares == null) throw new ProviderError(`Share count unavailable for ${symbol}`);
  if (last.fields.shares_outstanding == null) {
    notes.push("Shares outstanding proxied by diluted weighted-average shares of the latest fiscal year.");
  }

  const priceTs: number | undefined = meta.regularMarketTime;
  const priceDate = priceTs ? new Date(priceTs * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

  let listingCurrency: string = meta.currency ?? "USD";
  const listingPrice = Number(meta.regularMarketPrice);
  let price = listingPrice;
  let hi: number | null = meta.fiftyTwoWeekHigh ?? null;
  let lo: number | null = meta.fiftyTwoWeekLow ?? null;

  const minor = MINOR_UNITS[listingCurrency];
  if (minor) {
    const [major, div] = minor;
    notes.push(`Share price quoted in ${listingCurrency} (minor units): converted to ${major}.`);
    price = price / div;
    hi = hi != null ? hi / div : hi;
    lo = lo != null ? lo / div : lo;
    listingCurrency = major;
  }

  const currency = statementCurrency || listingCurrency;
  let fx: number | null = null;
  if (currency !== listingCurrency) {
    fx = await fetchFxRate(listingCurrency, currency);
    if (fx == null) {
      notes.push(
        `WARNING: the share price is quoted in ${listingCurrency} but the statements are in ${currency} and no FX rate could be retrieved; the price was left unconverted — override "Current share price" in Assumptions.`,
      );
    } else {
      notes.push(`Statements are reported in ${currency} while the share is quoted in ${listingCurrency}: converted at ${fx.toFixed(4)}.`);
      price = price * fx;
      hi = hi != null ? hi * fx : hi;
      lo = lo != null ? lo * fx : lo;
    }
  }

  const profile: CompanyProfile = {
    symbol,
    name: meta.longName ?? meta.shortName ?? symbol,
    exchange: meta.fullExchangeName ?? meta.exchangeName ?? "",
    currency,
    fiscalYearEndMonth: Number(last.periodEnd.slice(5, 7)),
    sector: sectorInfo.sector,
    industry: sectorInfo.industry,
  };
  // Cost of capital must be denominated in the currency of the cash flows: USD uses the live
  // 10Y Treasury; every other currency uses its local-currency default + country risk premium.
  const country = countryDefaults(currency);
  let rfRate = riskFree.rate;
  let rfSource = riskFree.source;
  let rfCurrency = "USD";
  if (currency !== "USD") {
    if (country) {
      const spread = sovereignDefaultSpread(country.crp);
      // normalised floor: near-zero yields (JPY, CHF, EUR at times) understate the return equity investors require
      const spot = country.riskFree - spread;
      rfRate = Math.max(spot, RF_FLOOR);
      rfSource = `${country.country} 10-year government yield ${(country.riskFree * 100).toFixed(2)}% less sovereign default spread ${(spread * 100).toFixed(2)}% (default-free ${currency} rate${spot < RF_FLOOR ? `; floored at a normalised ${(RF_FLOOR * 100).toFixed(1)}% because the spot yield is abnormally low` : ""}; static default — verify and override)`;
      rfCurrency = currency;
    } else {
      notes.push(`WARNING: no local-currency risk-free rate for ${currency}; the US 10-year yield is used against ${currency} cash flows — override the risk-free rate.`);
    }
  }
  const market: MarketSnapshot = {
    price,
    priceDate,
    sharesOutstanding: Number(shares),
    currency,
    fiftyTwoWeekHigh: hi,
    fiftyTwoWeekLow: lo,
    riskFreeRate: rfRate,
    riskFreeSource: rfSource,
    riskFreeCurrency: rfCurrency,
    countryRiskPremium: country?.crp ?? 0,
    sovereignDefaultSpread: currency !== "USD" && country ? sovereignDefaultSpread(country.crp) : 0,
    longRunGrowth: country?.g,
    countrySource: country ? `${country.country} country risk premium (static Damodaran-style default)` : "No country risk premium available",
    indexSymbol: idx.symbol,
    indexName: idx.name,
    listingCurrency,
    listingPrice,
    fxRate: fx,
  };
  if (rfRate == null) notes.push("Risk-free rate could not be retrieved; a default of 4.0% is used — override in Assumptions.");
  if (idx.symbol !== "^GSPC") notes.push(`Beta regressed against ${idx.name}.`);

  // Peer set (comps + bottom-up beta): best-effort with a hard time budget so the model never stalls on it.
  let peers: FinancialDataset["peers"] = null;
  try {
    peers = await Promise.race([
      fetchPeerSet(symbol, indexRaw, currency),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 14_000)),
    ]);
  } catch {
    peers = null;
  }
  if (!peers) notes.push("Peer set unavailable: bottom-up beta and trading comps fall back to the regression beta and are omitted.");

  return {
    profile,
    market,
    periods,
    stockPrices,
    indexPrices,
    source: "Yahoo Finance",
    retrievedAt: new Date().toISOString(),
    notes,
    ttm,
    peers,
  };
}
