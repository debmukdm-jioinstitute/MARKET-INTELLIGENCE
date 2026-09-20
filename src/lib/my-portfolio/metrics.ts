import { cagr, covariance, maxDrawdown, mean, percentile, returnsFromPrices, stdev } from "@/lib/analytics";
import { candleRangeToDates, fetchUpstoxFullQuotes, fetchUpstoxHistoricalCandles } from "@/lib/feeds/sources/upstox";
import { buildSecurityDetail } from "@/lib/feeds/security-detail";
import { fetchYahooHistory } from "@/lib/feeds/sources/yahoo";
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

const RF_ANNUAL = 0.065;
const RF_DAILY = RF_ANNUAL / 252;

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
};

async function fetchHoldingSeries(h: Holding): Promise<HoldingSeries> {
  if (h.market === "IN" && h.instrumentKey) {
    const { from, to } = candleRangeToDates("1Y");
    const [candles, quotes] = await Promise.all([
      fetchUpstoxHistoricalCandles(h.instrumentKey, "days", "1", from, to).catch(() => []),
      fetchUpstoxFullQuotes([{ instrumentKey: h.instrumentKey, symbol: h.symbol }]).catch(() => []),
    ]);
    const q = quotes[0];
    const history = candles.map((c) => ({ date: c.ts.slice(0, 10), value: c.close }));
    const bestBid = q?.depth.buy[0]?.price;
    const bestAsk = q?.depth.sell[0]?.price;
    const spread = bestBid && bestAsk && bestBid > 0 ? (bestAsk - bestBid) / ((bestAsk + bestBid) / 2) : null;
    const last = q?.ltp ?? history[history.length - 1]?.value ?? h.avgCost;
    const prevClose = q?.ohlc.close ?? last;
    return {
      holding: h,
      history,
      last,
      change: q ? last - prevClose : 0,
      changePct: q && prevClose > 0 ? (last - prevClose) / prevClose : 0,
      volume: q?.volume ?? null,
      avgVolume: null,
      pe: null,
      marketCap: null,
      bidAskSpreadPct: spread,
    };
  }
  const detail = await buildSecurityDetail(h.symbol).catch(() => null);
  const history = detail?.history ?? [];
  return {
    holding: h,
    history,
    last: detail?.quote.price ?? h.avgCost,
    change: detail?.quote.change ?? 0,
    changePct: detail?.quote.changePct ?? 0,
    volume: detail?.quote.volume ?? null,
    avgVolume: detail?.quote.avgVolume ?? null,
    pe: detail?.quote.pe ?? null,
    marketCap: detail?.quote.marketCap ?? null,
    bidAskSpreadPct: null,
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

  // ---- combined NAV series ----
  const earliestAdded = holdings.reduce((min, h) => (h.addedAt < min ? h.addedAt : min), holdings[0]!.addedAt);
  const dateSet = new Set<string>();
  for (const s of seriesList) for (const p of s.history) if (p.date >= earliestAdded) dateSet.add(p.date);
  for (const p of benchSorted) if (p.date >= earliestAdded) dateSet.add(p.date);
  const calendar = [...dateSet].sort();

  const holdingSorted = seriesList.map((s) => ({ ...s, sorted: [...s.history].sort((a, b) => (a.date < b.date ? -1 : 1)) }));

  const navSeriesRaw: SeriesPoint[] = calendar.map((date) => {
    let value = 0;
    for (const s of holdingSorted) {
      if (s.holding.addedAt > date) continue;
      const price = forwardFill(s.sorted, date) ?? s.holding.avgCost;
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
  set(m("concentration", top10Weight, pct(top10Weight, 1, ), "ok", top10Weight > 0.6 ? "warn" : "neutral"));
  const hhi = positions.reduce((s, r) => s + r.weight ** 2, 0);
  set(m("hhi", hhi, num(hhi, 4), "ok"));
  set(m("effectiveHoldings", hhi > 0 ? 1 / hhi : 0, num(hhi > 0 ? 1 / hhi : 0, 1), "ok"));
  set(m("grossExposure", 1, pct(1, 0, ), "ok"));
  set(m("netExposure", 1, pct(1, 0, ), "ok", "neutral", "No shorting supported — net exposure equals invested weight."));
  set(m("leverage", 1, "1.00x", "ok", "neutral", "No margin/borrowing supported in this tracker."));
  set(m("cashPct", 0, pct(0, 1, ), "ok", "neutral", "Every rupee added becomes a holding — no separate cash balance is modeled."));

  // Currency contribution (precise, no history needed beyond FX start/end)
  const usdWeight = positions.filter((r) => r.currency === "USD").reduce((s, r) => s + r.weight, 0);
  if (fxHistory.length >= 2 && usdWeight > 0) {
    const fxStart = fxHistory[0]!.value;
    const fxEnd = fxHistory[fxHistory.length - 1]!.value;
    const fxReturn = fxEnd / fxStart - 1;
    const currencyContribution = usdWeight * fxReturn;
    set(m("currencyContribution", currencyContribution, pct(currencyContribution), "ok"));
  } else {
    set(NA("currencyContribution", usdWeight > 0 ? "Not enough FX history yet." : "No foreign-currency holdings."));
  }

  // Stock contribution (top 5 by |contribution|)
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

  // Sector contribution — only where sector metadata is known
  const bySector = new Map<string, number>();
  let sectorKnownWeight = 0;
  for (const r of positions) {
    if (!r.sector) continue;
    sectorKnownWeight += r.weight;
    bySector.set(r.sector, (bySector.get(r.sector) ?? 0) + r.weight * r.pnlPct);
  }
  if (bySector.size > 0) {
    const top = [...bySector.entries()].sort((a, b2) => Math.abs(b2[1]) - Math.abs(a[1]))[0]!;
    set(
      m(
        "sectorContribution",
        top[1],
        `${top[0]} ${pct(top[1])}`,
        sectorKnownWeight < 0.99 ? "approx" : "ok",
        undefined,
        sectorKnownWeight < 0.99
          ? `Sector known for ${pct(sectorKnownWeight, 0, )} of NAV; the rest is unclassified.`
          : undefined,
      ),
    );
  } else {
    set(NA("sectorContribution", "No sector classification available for these holdings yet."));
  }

  // Asset allocation (India vs US equity, vs benchmark's implicit 100% in its own market)
  const inWeight = positions.filter((r) => r.market === "IN").reduce((s, r) => s + r.weight, 0);
  const usWeight = 1 - inWeight;
  set(
    m(
      "assetAllocation",
      null,
      `${pct(inWeight, 0, )} India / ${pct(usWeight, 0, )} US`,
      "approx",
      undefined,
      "Shown as your India/US split; a full allocation-effect number needs the benchmark's own India/US mix, which isn't modeled for single-country benchmarks.",
    ),
  );
  set(NA("factorContribution", "Requires a full multi-factor return-attribution model beyond this tracker's data."));

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
      pct(activeShare, 0, ),
      "approx",
      undefined,
      `Approximate — uses a static benchmark-weight snapshot dated ${BENCHMARK_SNAPSHOT_DATE}, not live index weights.`,
    ),
  );

  // Factor proxies
  const momentumEntries = seriesList
    .map((s) => {
      const sorted = [...s.history].sort((a, b2) => (a.date < b2.date ? -1 : 1));
      if (sorted.length < 22) return null;
      const p12 = sorted[Math.max(0, sorted.length - 252)]?.value;
      const p1 = sorted[sorted.length - 22]?.value;
      if (!p12 || !p1) return null;
      const weight = positions.find((r) => r.symbol === s.holding.symbol)?.weight ?? 0;
      return { weight, mom: p1 / p12 - 1 };
    })
    .filter((x): x is { weight: number; mom: number } => x != null);
  if (momentumEntries.length) {
    const totalW = momentumEntries.reduce((s, e) => s + e.weight, 0) || 1;
    const momentum = momentumEntries.reduce((s, e) => s + (e.weight / totalW) * e.mom, 0);
    set(m("factorMomentum", momentum, pct(momentum), "approx", undefined, "Statistical proxy (12M-minus-1M trailing return), not a true factor-model loading."));
  } else {
    set(NA("factorMomentum", "Not enough price history yet to estimate momentum."));
  }

  const volEntries = seriesList
    .map((s) => {
      const rets = returnsFromPrices(s.history.map((h) => h.value));
      if (rets.length < 10) return null;
      const weight = positions.find((r) => r.symbol === s.holding.symbol)?.weight ?? 0;
      return { weight, vol: stdev(rets) * Math.sqrt(252) };
    })
    .filter((x): x is { weight: number; vol: number } => x != null);
  if (volEntries.length) {
    const totalW = volEntries.reduce((s, e) => s + e.weight, 0) || 1;
    const avgVol = volEntries.reduce((s, e) => s + (e.weight / totalW) * e.vol, 0);
    // Normalize: negative z vs a 25% "typical" volatility reference so higher = calmer.
    const lowVol = (0.25 - avgVol) / 0.25;
    set(m("factorLowVol", lowVol, num(lowVol), "approx", undefined, "Statistical proxy (inverse realized volatility vs a 25% reference), not a true factor-model loading."));
  } else {
    set(NA("factorLowVol", "Not enough price history yet to estimate volatility."));
  }

  const peEntries = seriesList.filter((s) => s.pe && s.pe > 0);
  if (peEntries.length) {
    const totalW = peEntries.reduce((s, e) => s + (positions.find((r) => r.symbol === e.holding.symbol)?.weight ?? 0), 0) || 1;
    const value = peEntries.reduce(
      (s, e) => s + ((positions.find((r) => r.symbol === e.holding.symbol)?.weight ?? 0) / totalW) * (1 / e.pe!),
      0,
    );
    set(m("factorValue", value, pct(value, 1, ), "approx", undefined, `P/E available for ${peEntries.length}/${holdings.length} holdings; others excluded.`));
  } else {
    set(NA("factorValue", "No P/E data available yet for these holdings."));
  }

  const capEntries = seriesList.filter((s) => s.marketCap && s.marketCap > 0);
  if (capEntries.length) {
    const totalW = capEntries.reduce((s, e) => s + (positions.find((r) => r.symbol === e.holding.symbol)?.weight ?? 0), 0) || 1;
    const size = capEntries.reduce(
      (s, e) => s + ((positions.find((r) => r.symbol === e.holding.symbol)?.weight ?? 0) / totalW) * -Math.log10(e.marketCap!),
      0,
    );
    set(m("factorSize", size, num(size, 2), "approx", undefined, `Market-cap data available for ${capEntries.length}/${holdings.length} holdings (mostly US); India names aren't covered by this feed yet.`));
  } else {
    set(NA("factorSize", "No market-cap data available yet for these holdings."));
  }
  set(NA("factorGrowth", "Requires multi-year revenue/earnings history this app doesn't fetch."));
  set(NA("factorQuality", "Requires balance-sheet fundamentals (ROE, debt/equity) this app doesn't fetch."));

  // Turnover from trade log
  if (tradeLog.length && navInr > 0) {
    const buys = tradeLog.filter((t) => t.side === "BUY").reduce((s, t) => s + t.shares * t.price, 0);
    const sells = tradeLog.filter((t) => t.side === "SELL").reduce((s, t) => s + t.shares * t.price, 0);
    const firstDate = tradeLog.reduce((min, t) => (t.date < min ? t.date : min), tradeLog[0]!.date);
    const years = Math.max(1 / 12, (Date.now() - new Date(firstDate).getTime()) / (365 * 24 * 3600 * 1000));
    const turnover = Math.min(buys, sells || buys) / Math.max(navInr, 1) / years;
    set(m("turnover", turnover, pct(turnover, 1, ), "ok"));
  } else {
    set(NA("turnover", "No trade history yet."));
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
      set(m("marketImpact", impact, pct(impact, 2, ), "approx", undefined, "Illustrative square-root model estimate — not a measurement of real trading impact."));
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
    set(m("bidAskSpread", avgSpread, pct(avgSpread, 2, ), "approx", undefined, "Live top-of-book spread, India holdings only — not available from the US feed."));
  } else {
    set(NA("bidAskSpread", "Only available for India holdings with live market depth; none currently held or market is closed."));
  }
  set(NA("slippage", "Requires a real trade fill price vs decision price — this tracker records holdings, not live order execution."));
  set(NA("implementationShortfall", "Requires a real order blotter with execution timestamps — not available in a buy-and-track tracker."));

  // ---- history-dependent metrics ----
  if (!hasHistory) {
    const naNote = "Insufficient price history yet — check back after a day or two of data.";
    for (const id of [
      "absoluteReturn", "cagr", "twr", "mwrIrr", "rollingReturn", "activeReturn", "benchmarkReturn",
      "sharpe", "treynor", "sortino", "jensensAlpha", "informationRatio", "calmar", "sterling", "burke",
      "omega", "kappa", "m2", "appraisal", "beta", "alpha", "volatility", "var", "cvar", "trackingError",
      "downsideDeviation", "maxDrawdown", "avgDrawdown", "drawdownDuration", "recoveryPeriod", "recoveryFactor",
      "upsideCapture", "downsideCapture", "battingAverage",
    ]) {
      set(NA(id, naNote));
    }
  } else {
    const navValues = navSeries.map((v) => v.value);
    const totalReturn = navValues[navValues.length - 1]! / navValues[0]! - 1;
    const benchReturn = benchValuesAligned[benchValuesAligned.length - 1]! / benchValuesAligned[0]! - 1;
    const activeReturn = totalReturn - benchReturn;
    const cagrValue = cagr(navValues);
    const vol = stdev(p) * Math.sqrt(252);
    const benchVol = stdev(b) * Math.sqrt(252);
    const beta = covariance(p, b) / Math.max(stdev(b) ** 2, 1e-12);
    const alphaDaily = mean(p) - (RF_DAILY + beta * (mean(b) - RF_DAILY));
    const alpha = alphaDaily * 252;
    const downside = p.filter((r) => r < 0);
    const te = stdev(excess) * Math.sqrt(252);
    const sharpe = ((mean(p) - RF_DAILY) / Math.max(stdev(p), 1e-12)) * Math.sqrt(252);
    const sortino = ((mean(p) - RF_DAILY) / Math.max(stdev(downside), 1e-12)) * Math.sqrt(252);
    const treynor = beta !== 0 ? (mean(p) - RF_DAILY) * 252 / beta : null;
    const ir = te > 0 ? (mean(excess) / Math.max(stdev(excess), 1e-12)) * Math.sqrt(252) : 0;
    const mdd = maxDrawdown(navValues);
    const calmarValue = mdd !== 0 ? cagrValue / Math.abs(mdd) : null;
    const var95 = percentile(p, 0.05) * navInr;
    const tailLosses = p.filter((r) => r <= percentile(p, 0.05));
    const cvar95 = (tailLosses.length ? mean(tailLosses) : percentile(p, 0.05)) * navInr;
    const downsideDev = stdev(downside) * Math.sqrt(252);

    // Drawdown series
    let peak = navValues[0]!;
    let peakIdx = 0;
    let maxDd = 0;
    let maxDdStartIdx = 0;
    let maxDdTroughIdx = 0;
    const drawdowns: number[] = [];
    for (let i = 0; i < navValues.length; i += 1) {
      if (navValues[i]! > peak) {
        peak = navValues[i]!;
        peakIdx = i;
      }
      const dd = navValues[i]! / peak - 1;
      drawdowns.push(dd);
      if (dd < maxDd) {
        maxDd = dd;
        maxDdStartIdx = peakIdx;
        maxDdTroughIdx = i;
      }
    }
    const avgDrawdown = mean(drawdowns.filter((d) => d < 0)) || 0;
    let recoveryIdx = -1;
    for (let i = maxDdTroughIdx; i < navValues.length; i += 1) {
      if (navValues[i]! >= navValues[maxDdStartIdx]!) {
        recoveryIdx = i;
        break;
      }
    }
    const drawdownDurationDays = recoveryIdx >= 0 ? recoveryIdx - maxDdStartIdx : navValues.length - 1 - maxDdStartIdx;
    const recoveryPeriodDays = recoveryIdx >= 0 ? recoveryIdx - maxDdTroughIdx : null;
    const recoveryFactor = mdd !== 0 ? totalReturn / Math.abs(mdd) : null;

    // Sterling / Burke
    const sortedDrawdowns = [...drawdowns].filter((d) => d < 0).sort((a2, b2) => a2 - b2);
    const worst3 = sortedDrawdowns.slice(0, 3);
    const avgWorst3 = worst3.length ? Math.abs(mean(worst3)) : Math.abs(mdd) || 1e-6;
    const sterling = avgWorst3 > 0 ? cagrValue / avgWorst3 : null;
    const burkeDenom = Math.sqrt(drawdowns.filter((d) => d < 0).reduce((s, d) => s + d * d, 0)) || 1e-6;
    const burke = (mean(p) - RF_DAILY) * 252 / burkeDenom;

    // Omega / Kappa
    const gains = p.filter((r) => r > 0).reduce((s, r) => s + r, 0);
    const losses = Math.abs(p.filter((r) => r < 0).reduce((s, r) => s + r, 0));
    const omega = losses > 0 ? gains / losses : null;
    const downsideCubed = downside.reduce((s, r) => s + Math.abs(r) ** 3, 0) / Math.max(downside.length, 1);
    const kappaDenom = Math.cbrt(downsideCubed) || 1e-9;
    const kappa = (mean(p) - RF_DAILY) / kappaDenom;

    // M2, Appraisal
    const m2 = RF_ANNUAL + sharpe * benchVol;
    const specificRisk = Math.sqrt(Math.max(vol ** 2 - beta ** 2 * benchVol ** 2, 0));
    const appraisal = specificRisk > 0 ? alpha / specificRisk : null;

    // Capture ratios / batting average
    const upDays = b.map((r, i) => (r > 0 ? p[i]! : null)).filter((x): x is number => x != null);
    const upBenchDays = b.filter((r) => r > 0);
    const downDaysP = b.map((r, i) => (r < 0 ? p[i]! : null)).filter((x): x is number => x != null);
    const downBenchDays = b.filter((r) => r < 0);
    const upsideCapture = upBenchDays.length ? mean(upDays) / mean(upBenchDays) : null;
    const downsideCapture = downBenchDays.length ? mean(downDaysP) / mean(downBenchDays) : null;
    const battingAverage = n > 0 ? p.filter((r, i) => r > b[i]!).length / n : null;

    // TWR (chained daily returns) & rolling 1M return
    const twr = p.reduce((acc, r) => acc * (1 + r), 1) - 1;
    const rollWindow = Math.min(21, navValues.length - 1);
    const rollingReturn = rollWindow > 0 ? navValues[navValues.length - 1]! / navValues[navValues.length - 1 - rollWindow]! - 1 : null;

    // MWR/IRR via bisection on trade cashflows
    let irr: number | null = null;
    if (tradeLog.length) {
      const now = new Date();
      const flows = tradeLog.map((t) => ({
        t: (now.getTime() - new Date(t.date).getTime()) / (365 * 24 * 3600 * 1000),
        amount: t.side === "BUY" ? -t.shares * t.price : t.shares * t.price,
      }));
      flows.push({ t: 0, amount: navInr });
      const npv = (rate: number) => flows.reduce((s, f) => s + f.amount / (1 + rate) ** (1 - f.t), 0);
      let lo = -0.9;
      let hi = 5;
      if (npv(lo) * npv(hi) < 0) {
        for (let i = 0; i < 60; i += 1) {
          const mid = (lo + hi) / 2;
          if (npv(lo) * npv(mid) <= 0) hi = mid;
          else lo = mid;
        }
        irr = (lo + hi) / 2;
      }
    }

    set(m("absoluteReturn", totalReturn, pct(totalReturn), "ok", tone(totalReturn)));
    set(m("cagr", cagrValue, pct(cagrValue), "ok", tone(cagrValue)));
    set(m("twr", twr, pct(twr), "ok", tone(twr)));
    set(irr != null ? m("mwrIrr", irr, pct(irr), "ok", tone(irr)) : NA("mwrIrr", "Not enough trade history to solve for an IRR yet."));
    set(rollingReturn != null ? m("rollingReturn", rollingReturn, pct(rollingReturn), "ok", tone(rollingReturn), "Trailing ~1 month.") : NA("rollingReturn", "Not enough history yet."));
    set(m("activeReturn", activeReturn, pct(activeReturn), "ok", tone(activeReturn)));
    set(m("benchmarkReturn", benchReturn, pct(benchReturn), "ok", tone(benchReturn)));

    set(m("sharpe", sharpe, num(sharpe), "ok", sharpe >= 1 ? "up" : sharpe >= 0 ? "neutral" : "down"));
    set(treynor != null ? m("treynor", treynor, pct(treynor), "ok") : NA("treynor", "Beta is ~0 — Treynor Ratio is undefined."));
    set(m("sortino", sortino, num(sortino), "ok", sortino >= 1 ? "up" : "neutral"));
    set(m("jensensAlpha", alpha, pct(alpha), "ok", tone(alpha)));
    set(m("informationRatio", ir, num(ir), "ok", ir >= 0 ? "up" : "down"));
    set(calmarValue != null ? m("calmar", calmarValue, num(calmarValue), "ok") : NA("calmar", "No drawdown yet to divide by."));
    set(sterling != null ? m("sterling", sterling, num(sterling), "ok") : NA("sterling", "No drawdown yet to divide by."));
    set(m("burke", burke, num(burke), "ok"));
    set(omega != null ? m("omega", omega, num(omega), "ok") : NA("omega", "No losing days yet in the sample."));
    set(m("kappa", kappa, num(kappa), "ok"));
    set(m("m2", m2, pct(m2), "ok", tone(m2 - benchReturn)));
    set(appraisal != null ? m("appraisal", appraisal, num(appraisal), "ok") : NA("appraisal", "Specific risk is ~0 for this sample."));

    set(m("beta", beta, num(beta), "ok"));
    set(m("alpha", alpha, pct(alpha), "ok", tone(alpha)));
    set(m("volatility", vol, pct(vol, 1, ), "ok"));
    set(m("var", var95, inr(var95), "ok", "warn"));
    set(m("cvar", cvar95, inr(cvar95), "ok", "warn"));
    set(m("trackingError", te, pct(te, 1, ), "ok"));
    set(m("downsideDeviation", downsideDev, pct(downsideDev, 1, ), "ok"));

    set(m("maxDrawdown", mdd, pct(mdd), "ok", "warn"));
    set(m("avgDrawdown", avgDrawdown, pct(avgDrawdown), "ok"));
    set(m("drawdownDuration", drawdownDurationDays, `${drawdownDurationDays} days`, "ok"));
    set(
      recoveryPeriodDays != null
        ? m("recoveryPeriod", recoveryPeriodDays, `${recoveryPeriodDays} days`, "ok")
        : m("recoveryPeriod", null, "Ongoing", "approx", "warn", "Portfolio hasn't recovered to its pre-drawdown peak yet."),
    );
    set(recoveryFactor != null ? m("recoveryFactor", recoveryFactor, num(recoveryFactor), "ok") : NA("recoveryFactor", "No drawdown yet to divide by."));

    set(m("informationRatio", ir, num(ir), "ok", ir >= 0 ? "up" : "down"));
    set(m("trackingError", te, pct(te, 1, ), "ok"));
    set(
      upsideCapture != null
        ? m("upsideCapture", upsideCapture, pct(upsideCapture, 0, ), "ok")
        : NA("upsideCapture", "No up days for the benchmark in this sample yet."),
    );
    set(
      downsideCapture != null
        ? m("downsideCapture", downsideCapture, pct(downsideCapture, 0, ), "ok")
        : NA("downsideCapture", "No down days for the benchmark in this sample yet."),
    );
    set(
      battingAverage != null
        ? m("battingAverage", battingAverage, pct(battingAverage, 0, ), "ok")
        : NA("battingAverage", "Not enough overlapping history yet."),
    );
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
    debug: {
      benchHistoryLen: benchmarkHistory.length,
      fxHistoryLen: fxHistory.length,
      calendarLen: calendar.length,
      earliestAdded,
      sampleHistoryPoint: seriesList[0]?.history[0],
      sampleCheck: seriesList[0]?.history[0] ? seriesList[0]!.history[0]!.date >= earliestAdded : null,
      sampleDateType: typeof seriesList[0]?.history[0]?.date,
      perHolding: seriesList.map((s) => ({ symbol: s.holding.symbol, historyLen: s.history.length, addedAt: s.holding.addedAt, firstDate: s.history[0]?.date, lastDate: s.history[s.history.length-1]?.date })),
    },
  };
}
