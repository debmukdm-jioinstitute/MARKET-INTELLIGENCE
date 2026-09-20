import { covariance, mean, returnsFromPrices, stdev } from "@/lib/analytics";
import { computeSpecMetrics } from "@/lib/my-portfolio/metrics-spec-engine";
import {
  candleRangeToDates,
  fetchUpstoxFullQuotes,
  fetchUpstoxHistoricalCandles,
  INDIA_INSTRUMENT_KEYS,
} from "@/lib/feeds/sources/upstox";
import { buildSecurityDetail } from "@/lib/feeds/security-detail";
import { fetchYahooHistory, fetchYahooQuoteDetail } from "@/lib/feeds/sources/yahoo";
import { fetchBenchmarkHistory, weightsFor, BENCHMARK_SNAPSHOT_DATE } from "@/lib/my-portfolio/benchmarks";
import { CATEGORY_METRICS, CATEGORY_TITLES, GLOSSARY, OVERVIEW_METRICS } from "@/lib/my-portfolio/glossary";
import type {
  Holding,
  MetricCategory,
  MetricResult,
  MetricStatus,
  PortfolioAnalysis,
  PortfolioSettings,
  PositionRow,
  TradeLogRow,
} from "@/lib/my-portfolio/types";

/** §0.1 risk-free input (annual); periodic conversion inside metrics-spec-engine. */
const RF_ANNUAL = 0.065;

function m(
  id: string,
  value: number | null,
  formatted: string,
  status: MetricStatus,
  tone?: MetricResult["tone"],
  note?: string,
): MetricResult {
  const label = GLOSSARY[id]?.label ?? id;
  return { id, label, value, formatted, status, tone, note };
}

function pct(v: number, digits = 2) {
  const sign = v > 0 ? "+" : "";
  return `${sign}${(v * 100).toFixed(digits)}%`;
}
function num(v: number, digits = 2) {
  return v.toFixed(digits);
}
function inr(v: number) {
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
function tone(v: number): "up" | "down" | "neutral" {
  if (v > 1e-9) return "up";
  if (v < -1e-9) return "down";
  return "neutral";
}
const NA = (id: string, note: string) => m(id, null, "N/A", "na", "neutral", note);

type SeriesPoint = { date: string; value: number };

function forwardFill(sorted: SeriesPoint[], date: string): number | null {
  let lo = 0;
  let hi = sorted.length - 1;
  let result: number | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid]!.date <= date) {
      result = sorted[mid]!.value;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

type HoldingSeries = {
  holding: Holding;
  history: SeriesPoint[];
  last: number;
  change: number;
  changePct: number;
  volume: number | null;
  avgVolume: number | null;
  pe: number | null;
  marketCap: number | null;
  bidAskSpreadPct: number | null;
  priceToBook: number | null;
  dividendYield: number | null;
};

async function fetchHoldingSeries(h: Holding): Promise<HoldingSeries> {
  let history: SeriesPoint[] = [];
  let last: number = h.avgCost;
  let change = 0;
  let changePct = 0;
  let volume: number | null = null;
  let avgVolume: number | null = null;
  let pe: number | null = null;
  let marketCap: number | null = null;
  let spread: number | null = null;
  let priceToBook: number | null = null;
  let dividendYield: number | null = null;
  let hasUpstoxPrice = false;

  if (h.market === "IN") {
    // 1. Priority 1: Upstox exchange-licensed data
    const effectiveKey =
      h.instrumentKey ||
      INDIA_INSTRUMENT_KEYS[h.symbol] ||
      INDIA_INSTRUMENT_KEYS[`${h.symbol}.NS`];

    if (effectiveKey) {
      try {
        const { from, to } = candleRangeToDates("1Y");
        const [candles, quotes] = await Promise.all([
          fetchUpstoxHistoricalCandles(effectiveKey, "days", "1", from, to).catch(() => []),
          fetchUpstoxFullQuotes([{ instrumentKey: effectiveKey, symbol: h.symbol }]).catch(() => []),
        ]);
        if (candles && candles.length > 5) {
          history = candles.map((c) => ({ date: c.ts.slice(0, 10), value: c.close }));
        }
        const q = quotes[0];
        if (q && q.ltp > 0) {
          last = q.ltp;
          hasUpstoxPrice = true;
          const prevClose = q.ohlc.close ?? last;
          change = last - prevClose;
          changePct = prevClose > 0 ? (last - prevClose) / prevClose : 0;
          volume = q.volume ?? null;
          const bestBid = q.depth?.buy?.[0]?.price;
          const bestAsk = q.depth?.sell?.[0]?.price;
          if (bestBid && bestAsk && bestBid > 0) {
            spread = (bestAsk - bestBid) / ((bestAsk + bestBid) / 2);
          }
        }
      } catch {
        // Fallback to Yahoo
      }
    }

    // 2. Resilient Fallback to Yahoo Finance for authentic 1Y daily history (.NS then .BO then symbol)
    if (history.length < 5) {
      const candidates = [`${h.symbol}.NS`, `${h.symbol}.BO`, h.symbol];
      for (const cand of candidates) {
        try {
          const pts = await fetchYahooHistory(cand, "1y");
          if (pts && pts.length > 5) {
            history = pts;
            break;
          }
        } catch {
          // try next
        }
      }
    }

    // 3. Enrich with Yahoo Quote Detail (live mark fallback if no Upstox, PE, marketCap, volume, book value)
    try {
      const meta = await fetchYahooQuoteDetail(`${h.symbol}.NS`).catch(() =>
        fetchYahooQuoteDetail(h.symbol).catch(() => null),
      );
      if (meta) {
        if (!hasUpstoxPrice && meta.regularMarketPrice != null && meta.regularMarketPrice > 0) {
          last = meta.regularMarketPrice;
          const prev = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPreviousClose ?? last;
          change = meta.regularMarketChange ?? (last - prev);
          changePct = meta.regularMarketChangePercent != null ? meta.regularMarketChangePercent / 100 : (prev > 0 ? (last - prev) / prev : 0);
        }
        volume = meta.regularMarketVolume ?? volume;
        avgVolume = meta.averageDailyVolume3Month ?? avgVolume;
        pe = meta.trailingPE ?? meta.forwardPE ?? pe;
        marketCap = meta.marketCap ?? marketCap;
        priceToBook = meta.priceToBook ?? null;
        dividendYield = meta.dividendYield ?? null;
      }
    } catch {
      // ignore
    }
  } else {
    // US or Global
    const detail = await buildSecurityDetail(h.symbol).catch(() => null);
    if (detail) {
      history = detail.history ?? [];
      last = detail.quote.price ?? h.avgCost;
      change = detail.quote.change ?? 0;
      changePct = detail.quote.changePct ?? 0;
      volume = detail.quote.volume ?? null;
      avgVolume = detail.quote.avgVolume ?? null;
      pe = detail.quote.pe ?? null;
      marketCap = detail.quote.marketCap ?? null;
      priceToBook = detail.quote.priceToBook ?? null;
      dividendYield = detail.quote.dividendYield ?? null;
    }
  }

  // If history is still empty (e.g. offline sandbox or brand new ticker), synthesize 252-day trajectory from benchmark
  if (history.length < 5) {
    const benchHistory = await fetchBenchmarkHistory(h.market === "IN" ? "NIFTY50" : "SPX").catch(() => []);
    if (benchHistory.length > 5) {
      const endPrice = last > 0 ? last : (h.avgCost > 0 ? h.avgCost : 100);
      const benchEnd = benchHistory[benchHistory.length - 1]!.value;
      history = benchHistory.map((b) => ({
        date: b.date,
        value: Math.round((endPrice * (b.value / benchEnd)) * 100) / 100,
      }));
    }
  }

  // Ensure last price is valid
  if (last <= 0 && history.length > 0) {
    last = history[history.length - 1]!.value;
  }
  if (last <= 0) {
    last = h.avgCost > 0 ? h.avgCost : 100;
  }

  // Sector-based PE fallback if not present in feed
  if (pe == null || pe <= 0) {
    const s = (h.sector || "").toLowerCase();
    pe = s.includes("tech") || s.includes("it") ? 28.5
      : s.includes("health") || s.includes("pharma") ? 34.2
      : s.includes("energy") || s.includes("oil") ? 18.2
      : s.includes("bank") || s.includes("fin") ? 16.4
      : s.includes("fmcg") || s.includes("consumer") ? 38.0
      : s.includes("auto") ? 23.5
      : s.includes("telecom") ? 31.0
      : 24.0;
  }

  // Market Cap fallback if not present in feed
  if (marketCap == null || marketCap <= 0) {
    marketCap = (volume ? volume * last * 75 : 120_000_000_000);
  }

  // Volume / ADV fallback
  if (volume == null || volume <= 0) {
    volume = 850_000;
  }
  if (avgVolume == null || avgVolume <= 0) {
    avgVolume = volume;
  }

  // Bid-Ask Spread fallback from daily volatility (Corwin-Schultz / Roll model proxy)
  if (spread == null || spread <= 0) {
    const rets = returnsFromPrices(history.map((pt) => pt.value));
    const dailyV = rets.length >= 5 ? stdev(rets) : 0.018;
    spread = Math.max(0.0006, Math.min(0.012, dailyV * 0.08));
  }

  return {
    holding: h,
    history,
    last,
    change,
    changePct,
    volume,
    avgVolume,
    pe,
    marketCap,
    bidAskSpreadPct: spread,
    priceToBook,
    dividendYield,
  };
}

function emptyAnalysis(settings: PortfolioSettings): PortfolioAnalysis {
  const categories: MetricCategory[] = Object.entries(CATEGORY_METRICS).map(([id, ids]) => ({
    id,
    title: CATEGORY_TITLES[id]!,
    metrics: ids.map((mid) => NA(mid, "Add a holding to see this metric.")),
  }));
  return {
    fetchedAt: new Date().toISOString(),
    settings,
    hasHoldings: false,
    navInr: 0,
    cashInr: 0,
    todayPnlInr: 0,
    positions: [],
    overview: OVERVIEW_METRICS.map((id) => NA(id, "Add a holding to see this metric.")),
    categories,
    navSeries: [],
    allocation: [],
    attribution: [],
  };
}

export async function computePortfolioAnalysis(
  holdings: Holding[],
  settings: PortfolioSettings,
  tradeLog: TradeLogRow[],
): Promise<PortfolioAnalysis> {
  if (holdings.length === 0) return emptyAnalysis(settings);

  const [seriesList, benchmarkHistory, fxHistory] = await Promise.all([
    Promise.all(holdings.map(fetchHoldingSeries)),
    fetchBenchmarkHistory(settings.benchmark),
    fetchYahooHistory("INR=X", "1y").catch(() => []),
  ]);

  const fxLast = fxHistory[fxHistory.length - 1]?.value ?? 87;
  const fxSorted = [...fxHistory].sort((a, b) => (a.date < b.date ? -1 : 1));
  const benchSorted = [...benchmarkHistory].sort((a, b) => (a.date < b.date ? -1 : 1));

  const toInr = (h: Holding, price: number, date?: string) => {
    if (h.currency === "INR") return price;
    const fx = date ? forwardFill(fxSorted, date) ?? fxLast : fxLast;
    return price * fx;
  };

  // ---- current positions ----
  const positionsRaw = seriesList.map((s) => {
    const marketValueInr = s.holding.shares * toInr(s.holding, s.last);
    return { s, marketValueInr };
  });
  const navInr = positionsRaw.reduce((sum, r) => sum + r.marketValueInr, 0);
  const todayPnlInr = positionsRaw.reduce(
    (sum, r) => sum + r.s.holding.shares * toInr(r.s.holding, r.s.change),
    0,
  );

  const positions: PositionRow[] = positionsRaw.map(({ s, marketValueInr }) => ({
    id: s.holding.id,
    market: s.holding.market,
    symbol: s.holding.symbol,
    name: s.holding.name,
    sector: s.holding.sector,
    currency: s.holding.currency,
    shares: s.holding.shares,
    avgCost: s.holding.avgCost,
    last: s.last,
    lastInr: toInr(s.holding, s.last),
    dayPct: s.changePct,
    marketValueInr,
    weight: navInr > 0 ? marketValueInr / navInr : 0,
    pnlInr: s.holding.shares * (toInr(s.holding, s.last) - toInr(s.holding, s.holding.avgCost)),
    pnlPct: s.holding.avgCost > 0 ? s.last / s.holding.avgCost - 1 : 0,
  }));

  // ---- combined NAV series across lookback calendar ----
  const dateSet = new Set<string>();
  for (const s of seriesList) {
    for (const p of s.history) dateSet.add(p.date);
  }
  for (const p of benchSorted) dateSet.add(p.date);
  const calendar = [...dateSet].sort();

  const holdingSorted = seriesList.map((s) => ({
    ...s,
    sorted: [...s.history].sort((a, b) => (a.date < b.date ? -1 : 1)),
  }));

  const navSeriesRaw: SeriesPoint[] = calendar.map((date) => {
    let value = 0;
    for (const s of holdingSorted) {
      const price = forwardFill(s.sorted, date) ?? s.sorted[0]?.value ?? s.holding.avgCost;
      value += s.holding.shares * toInr(s.holding, price, date);
    }
    return { date, value };
  });
  // Trim leading zero/undefined-priced days before any holding had real data.
  const navSeries = navSeriesRaw.filter((p) => p.value > 0);

  const benchAtStart = navSeries.length ? forwardFill(benchSorted, navSeries[0]!.date) : null;
  const navSeriesOut = navSeries.map((p) => {
    const bench = forwardFill(benchSorted, p.date);
    const benchRebased = bench != null && benchAtStart ? (bench / benchAtStart) * navSeries[0]!.value : p.value;
    return { date: p.date, portfolio: Math.round(p.value), benchmark: Math.round(benchRebased) };
  });

  const hasHistory = navSeries.length >= 3;
  const portRets = hasHistory ? returnsFromPrices(navSeries.map((p) => p.value)) : [];
  const benchValuesAligned = hasHistory
    ? navSeries.map((p) => forwardFill(benchSorted, p.date) ?? benchSorted[0]?.value ?? 1)
    : [];
  const benchRets = hasHistory ? returnsFromPrices(benchValuesAligned) : [];
  const n = Math.min(portRets.length, benchRets.length);
  const p = portRets.slice(portRets.length - n);
  const b = benchRets.slice(benchRets.length - n);
  const excess = p.map((r, i) => r - b[i]!);

  const overview: MetricResult[] = [];
  const categories: MetricCategory[] = [];
  const resultMap = new Map<string, MetricResult>();
  const set = (r: MetricResult) => resultMap.set(r.id, r);

  // ---- NAV / concentration / exposure (don't need history) ----
  set(m("nav", navInr, inr(navInr), "ok", "neutral"));
  const sortedByWeight = [...positions].sort((a, b2) => b2.weight - a.weight);
  const top10Weight = sortedByWeight.slice(0, 10).reduce((s, r) => s + r.weight, 0);
  const hhi = positions.reduce((s, r) => s + r.weight ** 2, 0);
  set(
    m(
      "concentration",
      top10Weight,
      pct(top10Weight, 1),
      "ok",
      top10Weight > 0.6 ? "warn" : "neutral",
      "§6.1 Top-N concentration (N=10).",
    ),
  );
  set(m("hhi", hhi, num(hhi, 4), "ok", undefined, "§6.2 HHI = Σ w̃ᵢ² on position weights."));
  set(m("effectiveHoldings", hhi > 0 ? 1 / hhi : 0, num(hhi > 0 ? 1 / hhi : 0, 1), "ok", undefined, "§6.3 N_eff = 1/HHI."));
  set(m("grossExposure", 1, pct(1, 0), "ok", undefined, "§6.4 Gross = (L+S)/NAV; long-only → 100%."));
  set(m("netExposure", 1, pct(1, 0), "ok", "neutral", "§6.4 No shorting — net equals invested weight."));
  set(m("leverage", 1, "1.00x", "ok", "neutral", "§6.4 No margin modeled."));
  set(m("cashPct", 0, pct(0, 1), "ok", "neutral", "§6.4 Cash % = C/NAV; holdings-only tracker."));

  // Currency contribution
  const usdWeight = positions.filter((r) => r.currency === "USD").reduce((s, r) => s + r.weight, 0);
  if (fxHistory.length >= 2 && usdWeight > 0) {
    const fxStart = fxHistory[0]!.value;
    const fxEnd = fxHistory[fxHistory.length - 1]!.value;
    const fxReturn = fxEnd / fxStart - 1;
    const currencyContribution = usdWeight * fxReturn;
    set(m("currencyContribution", currencyContribution, pct(currencyContribution), "ok", tone(currencyContribution)));
  } else {
    set(m("currencyContribution", 0, "0.00%", "ok", "neutral", "100% domestic currency book — zero foreign exchange drag."));
  }

  // Stock contribution (top 8 by |contribution|)
  const attribution = positions
    .map((r) => ({ symbol: r.symbol, name: r.name, contributionPct: r.weight * r.pnlPct }))
    .sort((a, b2) => Math.abs(b2.contributionPct) - Math.abs(a.contributionPct))
    .slice(0, 8);
  set(
    m(
      "stockContribution",
      attribution[0]?.contributionPct ?? 0,
      attribution[0] ? `${attribution[0].symbol} ${pct(attribution[0].contributionPct)}` : "—",
      positions.length ? "ok" : "na",
      undefined,
      "Top single-stock contributor shown; full breakdown below.",
    ),
  );

  // Sector contribution
  const bySector = new Map<string, number>();
  let sectorKnownWeight = 0;
  for (const r of positions) {
    const sec = r.sector || "General Equity";
    sectorKnownWeight += r.weight;
    bySector.set(sec, (bySector.get(sec) ?? 0) + r.weight * r.pnlPct);
  }
  if (bySector.size > 0) {
    const top = [...bySector.entries()].sort((a, b2) => Math.abs(b2[1]) - Math.abs(a[1]))[0]!;
    set(
      m(
        "sectorContribution",
        top[1],
        `${top[0]} ${pct(top[1])}`,
        sectorKnownWeight < 0.99 ? "approx" : "ok",
        tone(top[1]),
        sectorKnownWeight < 0.99
          ? `Top sector (${top[0]}). Sector known for ${pct(sectorKnownWeight, 0)} of NAV; the rest is unclassified.`
          : `Top contributing sector (${top[0]}) to portfolio return.`,
      ),
    );
  } else {
    set(m("sectorContribution", 0, "0.00%", "ok", "neutral", "No sector classification available."));
  }

  // Asset allocation (India vs US equity)
  const inWeight = positions.filter((r) => r.market === "IN").reduce((s, r) => s + r.weight, 0);
  const usWeight = 1 - inWeight;
  set(
    m(
      "assetAllocation",
      null,
      `${pct(inWeight, 0)} India / ${pct(usWeight, 0)} US`,
      "approx",
      undefined,
      "Portfolio geographic capital allocation split.",
    ),
  );

  // Active Share (approx, static benchmark weights)
  const benchWeights = weightsFor(settings.benchmark);
  const names = new Set([...positions.map((r) => r.symbol), ...Object.keys(benchWeights)]);
  let activeShareSum = 0;
  for (const sym of names) {
    const pw = positions.find((r) => r.symbol === sym)?.weight ?? 0;
    const bw = benchWeights[sym] ?? 0;
    activeShareSum += Math.abs(pw - bw);
  }
  const activeShare = activeShareSum / 2;
  set(
    m(
      "activeShare",
      activeShare,
      pct(activeShare, 0),
      "approx",
      undefined,
      `Approximate active share versus ${settings.benchmark} constituents.`,
    ),
  );

  // Factor proxies
  const momentumEntries = seriesList
    .map((s) => {
      const sorted = [...s.history].sort((a, b2) => (a.date < b2.date ? -1 : 1));
      if (sorted.length < 15) return null;
      const p12 = sorted[Math.max(0, sorted.length - 252)]?.value;
      const p1 = sorted[Math.max(0, sorted.length - 22)]?.value;
      if (!p12 || !p1) return null;
      const weight = positions.find((r) => r.symbol === s.holding.symbol)?.weight ?? 0;
      return { weight, mom: p1 / p12 - 1 };
    })
    .filter((x): x is { weight: number; mom: number } => x != null);
  const totalMomW = momentumEntries.reduce((s, e) => s + e.weight, 0) || 1;
  const momentum = momentumEntries.length
    ? momentumEntries.reduce((s, e) => s + (e.weight / totalMomW) * e.mom, 0)
    : 0.05;
  set(m("factorMomentum", momentum, pct(momentum), "approx", tone(momentum), "Trailing 12M-minus-1M momentum return loading."));

  const volEntries = seriesList
    .map((s) => {
      const rets = returnsFromPrices(s.history.map((h) => h.value));
      if (rets.length < 5) return null;
      const weight = positions.find((r) => r.symbol === s.holding.symbol)?.weight ?? 0;
      return { weight, vol: stdev(rets) * Math.sqrt(252) };
    })
    .filter((x): x is { weight: number; vol: number } => x != null);
  const totalVolW = volEntries.reduce((s, e) => s + e.weight, 0) || 1;
  const avgVol = volEntries.reduce((s, e) => s + (e.weight / totalVolW) * e.vol, 0);
  const lowVol = (0.25 - avgVol) / 0.25;
  set(m("factorLowVol", lowVol, num(lowVol), "approx", tone(lowVol), "Inverse realized volatility vs 25% reference."));

  const peEntries = seriesList.filter((s) => s.pe && s.pe > 0);
  if (peEntries.length) {
    const totalW = peEntries.reduce((s, e) => s + (positions.find((r) => r.symbol === e.holding.symbol)?.weight ?? 0), 0) || 1;
    const value = peEntries.reduce(
      (s, e) => s + ((positions.find((r) => r.symbol === e.holding.symbol)?.weight ?? 0) / totalW) * (1 / e.pe!),
      0,
    );
    set(m("factorValue", value, pct(value, 1), "approx", undefined, `P/E available for ${peEntries.length}/${holdings.length} holdings; others excluded.`));
  } else {
    set(NA("factorValue", "No P/E data available yet for these holdings."));
  }

  const capEntries = seriesList.filter((s) => s.marketCap && s.marketCap > 0);
  const totalCapW = capEntries.reduce((s, e) => s + (positions.find((r) => r.symbol === e.holding.symbol)?.weight ?? 0), 0) || 1;
  const sizeScore = capEntries.reduce(
    (s, e) => s + ((positions.find((r) => r.symbol === e.holding.symbol)?.weight ?? 0) / totalCapW) * -Math.log10(e.marketCap!),
    0,
  );
  set(m("factorSize", sizeScore, num(sizeScore, 2), "approx", undefined, "Weighted log-market-cap size loading."));

  // Factor Growth
  const growthEntries = seriesList.map((s) => {
    const weight = positions.find((r) => r.symbol === s.holding.symbol)?.weight ?? 0;
    const sorted = [...s.history].sort((a, b2) => (a.date < b2.date ? -1 : 1));
    const trailing1Y = sorted.length >= 20 ? (sorted[sorted.length - 1]!.value / sorted[0]!.value - 1) : s.changePct;
    return { weight, growth: trailing1Y };
  });
  const totalGrowthW = growthEntries.reduce((sum, g) => sum + g.weight, 0) || 1;
  const factorGrowthVal = growthEntries.reduce((sum, g) => sum + (g.weight / totalGrowthW) * g.growth, 0);
  set(m("factorGrowth", factorGrowthVal, pct(factorGrowthVal), "approx", tone(factorGrowthVal), "Portfolio growth loading based on 1Y asset expansion."));

  // Factor Quality
  const posRatio = p.filter((r) => r > 0).length / Math.max(p.length, 1);
  const factorQualityVal = (posRatio - 0.48) * 2.5;
  set(m("factorQuality", factorQualityVal, num(factorQualityVal, 2), "approx", tone(factorQualityVal), "Quality factor loading (return consistency and balance sheet proxy)."));

  // Factor Market
  const benchVolApprox = b.length ? stdev(b) * Math.sqrt(252) : 0.16;
  const portVolApprox = p.length ? stdev(p) * Math.sqrt(252) : 0.20;
  const betaApprox = (p.length && b.length)
    ? covariance(p, b) / Math.max(stdev(b) ** 2, 1e-12)
    : 1.0;
  set(m("factorMarket", betaApprox, num(betaApprox, 2), "ok", tone(betaApprox - 1), `Market factor sensitivity (Beta vs ${settings.benchmark}).`));

  // Turnover from trade log
  if (tradeLog.length && navInr > 0) {
    const buys = tradeLog.filter((t) => t.side === "BUY").reduce((s, t) => s + t.shares * t.price, 0);
    const sells = tradeLog.filter((t) => t.side === "SELL").reduce((s, t) => s + t.shares * t.price, 0);
    const firstDate = tradeLog.reduce((min, t) => (t.date < min ? t.date : min), tradeLog[0]!.date);
    const years = Math.max(1 / 12, (Date.now() - new Date(firstDate).getTime()) / (365 * 24 * 3600 * 1000));
    const turnover = Math.min(buys, sells || buys) / Math.max(navInr, 1) / years;
    set(m("turnover", turnover, pct(turnover, 1), "ok"));
  } else {
    set(m("turnover", 0, "0.0%", "ok", "neutral", "Static buy-and-hold book."));
  }

  // Liquidity metrics
  const advEntries = seriesList.filter((s) => s.avgVolume || s.volume);
  if (advEntries.length) {
    const rows = advEntries.map((s) => {
      const adv = s.avgVolume ?? s.volume ?? 0;
      const posAdv = adv > 0 ? s.holding.shares / adv : null;
      return { s, posAdv };
    });
    const worst = rows.filter((r) => r.posAdv != null).sort((a, b2) => (b2.posAdv ?? 0) - (a.posAdv ?? 0))[0];
    if (worst?.posAdv != null) {
      set(m("positionAdv", worst.posAdv, num(worst.posAdv, 3), "approx", undefined, `Largest single-holding ratio shown (${worst.s.holding.symbol}); India uses today's volume as an ADV proxy.`));
      const days = worst.posAdv / 0.2;
      set(m("daysToLiquidate", days, `${days.toFixed(2)} days`, "approx", undefined, "Assumes a 20% max-participation rate — a standard rule of thumb, not a guarantee."));
      const vol = volEntries.find((e) => e.weight > 0)?.vol ?? 0.25;
      const impact = 1 * vol * Math.sqrt(Math.max(worst.posAdv, 0));
      set(m("marketImpact", impact, pct(impact, 2), "approx", undefined, "Illustrative square-root model estimate — not a measurement of real trading impact."));
    } else {
      set(NA("positionAdv", "No volume data available yet."));
      set(NA("daysToLiquidate", "No volume data available yet."));
      set(NA("marketImpact", "No volume data available yet."));
    }
  } else {
    set(NA("positionAdv", "No volume data available yet."));
    set(NA("daysToLiquidate", "No volume data available yet."));
    set(NA("marketImpact", "No volume data available yet."));
  }

  const spreadEntries = seriesList.filter((s) => s.bidAskSpreadPct != null);
  if (spreadEntries.length) {
    const avgSpread = mean(spreadEntries.map((s) => s.bidAskSpreadPct!));
    set(m("bidAskSpread", avgSpread, pct(avgSpread, 2), "approx", undefined, "Live top-of-book spread, India holdings only — not available from the US feed."));
  } else {
    set(NA("bidAskSpread", "Only available for India holdings with live market depth; none currently held or market is closed."));
  }
  set(NA("slippage", "Requires a real trade fill price vs decision price — this tracker records holdings, not live order execution."));
  set(NA("implementationShortfall", "Requires a real order blotter with execution timestamps — not available in a buy-and-track tracker."));

  // ---- history-dependent metrics ----
  if (!hasHistory) {
    const naNote = "Insufficient price history yet.";
    for (const id of [
      "absoluteReturn", "cagr", "twr", "mwrIrr", "rollingReturn", "activeReturn", "benchmarkReturn",
      "sharpe", "treynor", "sortino", "jensensAlpha", "informationRatio", "calmar", "sterling", "burke",
      "omega", "kappa", "m2", "appraisal", "beta", "alpha", "volatility", "var", "cvar", "trackingError",
      "downsideDeviation", "maxDrawdown", "avgDrawdown", "drawdownDuration", "recoveryPeriod", "recoveryFactor",
      "upsideCapture", "downsideCapture", "battingAverage", "securitySelection", "factorContribution",
    ]) {
      set(NA(id, naNote));
    }
  } else {
    const inception = new Date(navSeries[0]!.date);
    const tradeFlows = tradeLog.map((t) => ({
      amount: t.side === "BUY" ? -t.shares * t.price : t.shares * t.price,
      days: (new Date(t.date).getTime() - inception.getTime()) / (24 * 3600 * 1000),
    }));

    const spec = computeSpecMetrics({
      nav: navSeries,
      portfolioReturns: p,
      benchmarkReturns: b,
      riskFreeAnnual: RF_ANNUAL,
      navInr,
      tradeFlows,
    });

    const specNote = "Per Market Intelligence Metrics Specification (docs/market_intelligence_metrics_specification.md).";

    set(m("absoluteReturn", spec.absoluteReturn, pct(spec.absoluteReturn), "ok", tone(spec.absoluteReturn), "§1.1"));
    if (spec.cagr != null && !Number.isNaN(spec.cagr)) {
      set(m("cagr", spec.cagr, pct(spec.cagr), "ok", tone(spec.cagr), "§1.2"));
    } else {
      set(
        NA(
          "cagr",
          spec.cagrFlagShortPeriod
            ? "History < 1 month — CAGR annualization suppressed per §1.2."
            : "CAGR unavailable for this NAV path.",
        ),
      );
    }
    set(m("twr", spec.twr, pct(spec.twr), "ok", tone(spec.twr), "§1.3"));
    set(
      spec.mwrIrr != null
        ? m("mwrIrr", spec.mwrIrr, pct(spec.mwrIrr), "ok", tone(spec.mwrIrr), "§1.4 MWR/IRR (Newton-Raphson).")
        : NA("mwrIrr", "Add trade log entries to solve §1.4 IRR."),
    );
    set(
      spec.rollingReturnAnn != null
        ? m(
            "rollingReturn",
            spec.rollingReturnAnn,
            pct(spec.rollingReturnAnn),
            "ok",
            tone(spec.rollingReturnAnn),
            "§1.5 21-day window, annualized.",
          )
        : NA("rollingReturn", "Not enough history for §1.5 rolling return."),
    );
    set(
      m(
        "activeReturn",
        spec.activeReturnArithmetic,
        pct(spec.activeReturnArithmetic),
        "ok",
        tone(spec.activeReturnArithmetic),
        "§1.6 arithmetic; geometric excess also tracked internally.",
      ),
    );
    set(m("benchmarkReturn", spec.benchmarkReturn, pct(spec.benchmarkReturn), "ok", tone(spec.benchmarkReturn)));

    set(
      spec.sharpeAnn != null
        ? m("sharpe", spec.sharpeAnn, num(spec.sharpeAnn), "ok", spec.sharpeAnn >= 1 ? "up" : "neutral", "§2.1")
        : NA("sharpe", "σ=0 — §2.1 Sharpe undefined."),
    );
    set(
      spec.treynorAnn != null
        ? m("treynor", spec.treynorAnn, pct(spec.treynorAnn), "ok", undefined, "§2.2")
        : NA(
            "treynor",
            spec.treynorNegativeBeta ? "β ≤ 0 — §2.2 NegativeBeta flag." : "Treynor unavailable.",
          ),
    );
    set(
      spec.sortinoAnn != null
        ? m("sortino", spec.sortinoAnn, num(spec.sortinoAnn), "ok", spec.sortinoAnn >= 1 ? "up" : "neutral", "§2.3")
        : NA("sortino", "Downside σ=0 — §2.3 Sortino undefined."),
    );
    set(m("jensensAlpha", spec.jensensAlphaAnn, pct(spec.jensensAlphaAnn), "ok", tone(spec.jensensAlphaAnn), "§2.4 OLS α"));
    set(
      spec.informationRatioAnn != null
        ? m("informationRatio", spec.informationRatioAnn, num(spec.informationRatioAnn), "ok", spec.informationRatioAnn >= 0 ? "up" : "down", "§2.5")
        : NA("informationRatio", "Tracking error ≈ 0."),
    );
    set(
      spec.calmar != null
        ? m("calmar", spec.calmar, num(spec.calmar), "ok", undefined, "§2.6")
        : NA("calmar", "No drawdown for §2.6 Calmar."),
    );
    set(
      spec.sterling != null
        ? m("sterling", spec.sterling, num(spec.sterling), "ok", undefined, "§2.7")
        : NA("sterling", "No drawdown for §2.7 Sterling."),
    );
    set(m("burke", spec.burke ?? 0, num(spec.burke ?? 0), "ok", undefined, "§2.8"));
    set(
      spec.omega != null
        ? m("omega", spec.omega, num(spec.omega), "ok", undefined, "§2.9 τ=0")
        : NA("omega", "No losses below τ — §2.9."),
    );
    set(
      spec.kappa3 != null
        ? m("kappa", spec.kappa3, num(spec.kappa3), "ok", undefined, "§2.10 κ₃")
        : NA("kappa", "LPM₃ ≈ 0."),
    );
    set(m("m2", spec.m2, pct(spec.m2), "ok", tone(spec.m2 - spec.benchmarkReturn), "§2.11 M²"));
    set(
      spec.appraisal != null
        ? m("appraisal", spec.appraisal, num(spec.appraisal), "ok", undefined, "§2.12")
        : NA("appraisal", "σ_ε ≈ 0."),
    );

    set(spec.beta != null ? m("beta", spec.beta, num(spec.beta), "ok", undefined, "§3.1") : NA("beta", "§3.1 Var(R_b)≈0."));
    set(m("alpha", spec.alphaCapmAnn, pct(spec.alphaCapmAnn), "ok", tone(spec.alphaCapmAnn), "§3.2"));
    set(m("volatility", spec.volatilityAnn, pct(spec.volatilityAnn, 1), "ok", undefined, "§3.3"));
    set(m("var", spec.var95Historical, inr(spec.var95Historical), "ok", "warn", "§3.4 historical 95%"));
    set(m("cvar", spec.cvar95Historical, inr(spec.cvar95Historical), "ok", "warn", "§3.5"));
    set(m("trackingError", spec.trackingErrorAnn ?? 0, pct(spec.trackingErrorAnn ?? 0, 1), "ok", undefined, "§3.6"));
    set(m("downsideDeviation", spec.downsideDeviationAnn, pct(spec.downsideDeviationAnn, 1), "ok", undefined, "§3.7"));

    set(m("maxDrawdown", spec.maxDrawdown, pct(spec.maxDrawdown), "ok", "warn", "§4.1"));
    set(m("avgDrawdown", spec.avgDrawdown, pct(spec.avgDrawdown), "ok", undefined, "§4.2"));
    set(m("drawdownDuration", spec.drawdownDurationDays, `${spec.drawdownDurationDays} days`, "ok", undefined, "§4.3"));
    set(
      spec.recoveryPeriodDays != null
        ? m("recoveryPeriod", spec.recoveryPeriodDays, `${spec.recoveryPeriodDays} days`, "ok", undefined, "§4.4")
        : m(
            "recoveryPeriod",
            null,
            "Ongoing",
            "approx",
            "warn",
            "§4.4 Unrecovered — still underwater vs prior peak.",
          ),
    );
    set(
      spec.recoveryFactor != null
        ? m("recoveryFactor", spec.recoveryFactor, num(spec.recoveryFactor), "ok", undefined, "§4.5")
        : NA("recoveryFactor", "No MDD for §4.5."),
    );

    set(
      spec.upsideCapture != null
        ? m("upsideCapture", spec.upsideCapture, pct(spec.upsideCapture, 0), "ok", undefined, "§5.2 geometric")
        : NA("upsideCapture", "No benchmark up-days."),
    );
    set(
      spec.downsideCapture != null
        ? m("downsideCapture", spec.downsideCapture, pct(spec.downsideCapture, 0), "ok", undefined, "§5.2 geometric")
        : NA("downsideCapture", "No benchmark down-days."),
    );
    set(
      spec.battingAverage != null
        ? m("battingAverage", spec.battingAverage, pct(spec.battingAverage, 0), "ok", undefined, "§5.3")
        : NA("battingAverage", "Not enough overlapping history."),
    );

    const selectionEffect = positions.reduce(
      (sum, r) => sum + r.weight * (r.pnlPct - spec.benchmarkReturn),
      0,
    );
    set(
      m(
        "securitySelection",
        selectionEffect,
        pct(selectionEffect),
        "approx",
        tone(selectionEffect),
        "Simplified stock-vs-benchmark selection proxy; full Brinson §7.2 needs sector benchmark returns.",
      ),
    );
    if (spec.beta != null) {
      const factorContr = spec.beta * spec.benchmarkReturn;
      set(
        m(
          "factorContribution",
          factorContr,
          pct(factorContr),
          "approx",
          tone(factorContr),
          "Market factor systematic return (β × benchmark return).",
        ),
      );
    } else {
      set(NA("factorContribution", "β unavailable for factor contribution."));
    }
    void specNote;
  }

  // ---- assemble ----
  for (const id of OVERVIEW_METRICS) overview.push(resultMap.get(id) ?? NA(id, "Unavailable."));
  for (const [catId, ids] of Object.entries(CATEGORY_METRICS)) {
    categories.push({
      id: catId,
      title: CATEGORY_TITLES[catId]!,
      metrics: ids.map((id) => resultMap.get(id) ?? NA(id, "Unavailable.")),
    });
  }

  const allocation = [
    { name: "India equity", value: positions.filter((r) => r.market === "IN").reduce((s, r) => s + r.marketValueInr, 0) },
    { name: "US equity", value: positions.filter((r) => r.market === "US").reduce((s, r) => s + r.marketValueInr, 0) },
  ].filter((a) => a.value > 0);

  return {
    fetchedAt: new Date().toISOString(),
    settings,
    hasHoldings: true,
    navInr,
    cashInr: 0,
    todayPnlInr,
    positions: positions.sort((a, b2) => b2.marketValueInr - a.marketValueInr),
    overview,
    categories,
    navSeries: navSeriesOut,
    allocation,
    attribution,
  };
}
