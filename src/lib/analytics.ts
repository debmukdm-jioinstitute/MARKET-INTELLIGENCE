import { TRADING_DAYS } from "@/lib/calendar";
import { formatCompactUsd, formatNumber, formatPct, formatUsd, toneFromSigned } from "@/lib/format";
import { getPrice, getPriceSeries, getReturns } from "@/lib/market";
import type { Holding, KpiMetric, SeriesPoint, Trade, VirtualPortfolio } from "@/lib/types";
import { getInstrument } from "@/lib/universe";

const RF_DAILY = 0.045 / 252;

export function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function stdev(values: number[], sample = true) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const denom = sample ? values.length - 1 : values.length;
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / denom;
  return Math.sqrt(variance);
}

export function covariance(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += (a[i]! - ma) * (b[i]! - mb);
  return sum / (n - 1);
}

export function returnsFromPrices(prices: number[]) {
  const out: number[] = [];
  for (let i = 1; i < prices.length; i += 1) out.push(prices[i]! / prices[i - 1]! - 1);
  return out;
}

export function maxDrawdown(values: number[]) {
  if (!values.length) return 0;
  let peak = values[0] ?? 0;
  let maxDd = 0;
  for (const value of values) {
    if (value > peak) peak = value;
    if (peak > 0) {
      maxDd = Math.min(maxDd, value / peak - 1);
    }
  }
  return Number.isFinite(maxDd) ? maxDd : 0;
}

export function cagr(values: number[], periodsPerYear = 252) {
  if (values.length < 2 || !values[0] || values[0] <= 0) return 0;
  const last = values[values.length - 1] ?? 0;
  if (last <= 0) return -1;
  const years = (values.length - 1) / periodsPerYear;
  const val = (last / values[0]!) ** (1 / Math.max(years, 1 / 252)) - 1;
  return Number.isFinite(val) ? val : 0;
}

export function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1))));
  return sorted[idx]!;
}

function navPath(portfolio: VirtualPortfolio) {
  const start = TRADING_DAYS.indexOf(portfolio.inception);
  const from = start < 0 ? 0 : start;
  const dates = TRADING_DAYS.slice(from);
  return dates.map((date) => ({
    date,
    value:
      portfolio.cash +
      portfolio.holdings.reduce((sum, holding) => sum + holding.shares * getPrice(holding.symbol, date), 0),
  }));
}

export function currentMarketValue(holdings: Holding[], date?: string) {
  return holdings.reduce((sum, holding) => sum + holding.shares * getPrice(holding.symbol, date), 0);
}

export function positionRows(portfolio: VirtualPortfolio) {
  const total = currentMarketValue(portfolio.holdings) + portfolio.cash;
  return portfolio.holdings
    .map((holding) => {
      const instrument = getInstrument(holding.symbol);
      const last = getPrice(holding.symbol);
      const prev = getPrice(holding.symbol, TRADING_DAYS[TRADING_DAYS.length - 2]);
      const marketValue = holding.shares * last;
      const pnl = (last - holding.avgCost) * holding.shares;
      return {
        ...holding,
        name: instrument.name,
        assetClass: instrument.assetClass,
        sector: instrument.sector,
        region: instrument.region,
        last,
        dayPnl: (last - prev) * holding.shares,
        dayPct: last / prev - 1,
        marketValue,
        weight: total > 0 ? marketValue / total : 0,
        pnl,
        pnlPct: holding.avgCost > 0 ? last / holding.avgCost - 1 : 0,
      };
    })
    .sort((a, b) => b.marketValue - a.marketValue);
}

export function allocationBy(portfolio: VirtualPortfolio, key: "assetClass" | "sector" | "region") {
  const rows = positionRows(portfolio);
  const buckets = new Map<string, number>();
  for (const row of rows) {
    buckets.set(row[key], (buckets.get(row[key]) ?? 0) + row.marketValue);
  }
  if (portfolio.cash > 0) {
    const label = key === "assetClass" ? "Cash" : "Cash";
    buckets.set(label, (buckets.get(label) ?? 0) + portfolio.cash);
  }
  const total = [...buckets.values()].reduce((sum, value) => sum + value, 0);
  return [...buckets.entries()]
    .map(([name, value]) => ({ name, value, weight: value / total }))
    .sort((a, b) => b.value - a.value);
}

export function annualTurnover(portfolio: VirtualPortfolio) {
  const nav = navPath(portfolio);
  if (nav.length < 2) return 0;
  const avgAum = mean(nav.map((p) => p.value));
  const buys = portfolio.trades
    .filter((t) => t.side === "BUY")
    .reduce((sum, t) => sum + t.notional, 0);
  const sells = portfolio.trades
    .filter((t) => t.side === "SELL")
    .reduce((sum, t) => sum + t.notional, 0);
  const years = (nav.length - 1) / 252;
  return Math.min(buys, sells) / Math.max(avgAum, 1) / Math.max(years, 1 / 12);
}

export function analyzePortfolio(portfolio: VirtualPortfolio, benchmark = "SPY") {
  const nav = navPath(portfolio);
  const portRets = returnsFromPrices(nav.map((p) => p.value));
  const benchPrices = getPriceSeries(benchmark).slice(
    TRADING_DAYS.indexOf(nav[0]!.date),
  );
  const benchRets = returnsFromPrices(benchPrices);
  const n = Math.min(portRets.length, benchRets.length);
  const p = portRets.slice(0, n);
  const b = benchRets.slice(0, n);
  const excess = p.map((r, i) => r - b[i]!);
  const beta = covariance(p, b) / Math.max(stdev(b) ** 2, 1e-12);
  const alphaDaily = mean(p) - (RF_DAILY + beta * (mean(b) - RF_DAILY));
  const downside = p.filter((r) => r < 0);
  const vol = stdev(p) * Math.sqrt(252);
  const te = stdev(excess) * Math.sqrt(252);
  const sharpe = (mean(p) - RF_DAILY) / Math.max(stdev(p), 1e-12) * Math.sqrt(252);
  const sortino = (mean(p) - RF_DAILY) / Math.max(stdev(downside), 1e-12) * Math.sqrt(252);
  const total = nav[nav.length - 1]?.value ?? 0;
  const start = nav[0]?.value ?? 0;
  const prev = nav[nav.length - 2]?.value ?? start;
  const todayPnl = total - prev;
  const var95 = percentile(p, 0.05) * total;
  const cashPct = total > 0 ? portfolio.cash / total : 0;
  const mdd = maxDrawdown(nav.map((point) => point.value));
  const ir = mean(excess) / Math.max(stdev(excess), 1e-12) * Math.sqrt(252);
  const alpha = alphaDaily * 252;
  const totalReturn = start > 0 ? total / start - 1 : 0;
  const cagrValue = cagr(nav.map((point) => point.value));
  const turnover = annualTurnover(portfolio);

  const kpis: KpiMetric[] = [
    {
      key: "portfolioValue",
      label: "Portfolio Value",
      value: total,
      formatted: formatUsd(total),
      deltaLabel: formatCompactUsd(todayPnl),
      tone: "neutral",
      hint: "Mark-to-market NAV including cash.",
    },
    {
      key: "todayPnl",
      label: "Today's P&L",
      value: todayPnl,
      formatted: formatUsd(todayPnl, true),
      deltaLabel: prev > 0 ? formatPct(todayPnl / prev) : "+0.00%",
      tone: toneFromSigned(todayPnl),
      hint: "One-session change in NAV.",
    },
    {
      key: "totalReturn",
      label: "Total Return",
      value: totalReturn,
      formatted: formatPct(totalReturn),
      tone: toneFromSigned(totalReturn),
      hint: "Cumulative return since inception.",
    },
    {
      key: "cagr",
      label: "CAGR",
      value: cagrValue,
      formatted: formatPct(cagrValue),
      tone: toneFromSigned(cagrValue),
      hint: "Annualized compound growth of NAV.",
    },
    {
      key: "alpha",
      label: "Alpha",
      value: alpha,
      formatted: formatPct(alpha),
      tone: toneFromSigned(alpha),
      hint: `CAPM intercept vs ${benchmark}, annualized.`,
    },
    {
      key: "beta",
      label: "Beta",
      value: beta,
      formatted: formatNumber(beta),
      tone: "neutral",
      hint: `Systematic sensitivity to ${benchmark}.`,
    },
    {
      key: "sharpe",
      label: "Sharpe Ratio",
      value: sharpe,
      formatted: formatNumber(sharpe),
      tone: sharpe >= 1 ? "up" : sharpe >= 0.4 ? "neutral" : "down",
      hint: "Excess return per unit of total volatility.",
    },
    {
      key: "sortino",
      label: "Sortino Ratio",
      value: sortino,
      formatted: formatNumber(sortino),
      tone: sortino >= 1.2 ? "up" : "neutral",
      hint: "Excess return per unit of downside volatility.",
    },
    {
      key: "maxDrawdown",
      label: "Maximum Drawdown",
      value: mdd,
      formatted: formatPct(mdd),
      tone: "warn",
      hint: "Peak-to-trough decline on the NAV path.",
    },
    {
      key: "volatility",
      label: "Volatility",
      value: vol,
      formatted: formatPct(vol, 1, false),
      tone: "neutral",
      hint: "Annualized standard deviation of daily returns.",
    },
    {
      key: "trackingError",
      label: "Tracking Error",
      value: te,
      formatted: formatPct(te, 1, false),
      tone: "neutral",
      hint: `Active-risk vs ${benchmark}.`,
    },
    {
      key: "informationRatio",
      label: "Information Ratio",
      value: ir,
      formatted: formatNumber(ir),
      tone: ir >= 0.5 ? "up" : ir >= 0 ? "neutral" : "down",
      hint: "Active return per unit of tracking error.",
    },
    {
      key: "var95",
      label: "Value at Risk",
      value: var95,
      formatted: formatUsd(var95),
      deltaLabel: "95% 1-day",
      tone: "warn",
      hint: "Historical 5th percentile daily P&L.",
    },
    {
      key: "cashPct",
      label: "Cash %",
      value: cashPct,
      formatted: formatPct(cashPct, 1, false),
      tone: "neutral",
      hint: "Uninvested capital as a share of NAV.",
    },
    {
      key: "turnover",
      label: "Portfolio Turnover",
      value: turnover,
      formatted: formatPct(turnover, 1, false),
      tone: "neutral",
      hint: "Annualized min(buys, sells) / average AUM.",
    },
  ];

  return {
    nav,
    portRets: p,
    benchRets: b,
    kpis,
    total,
    start,
    beta,
    alpha,
    vol,
    te,
  };
}

export function brinsonAttribution(portfolio: VirtualPortfolio, benchmark = "SPY") {
  const rows = positionRows(portfolio);
  const benchWeight = 1;
  const benchRet = getReturns(benchmark).slice(-21);
  const benchPeriod = benchRet.reduce((acc, r) => acc * (1 + r), 1) - 1;
  const sectors = allocationBy(portfolio, "sector");
  return sectors
    .filter((s) => s.name !== "Cash")
    .map((sector) => {
      const names = rows.filter((r) => r.sector === sector.name);
      const sectorRet = names.reduce((sum, row) => {
        const r = getReturns(row.symbol).slice(-21).reduce((acc, x) => acc * (1 + x), 1) - 1;
        const w = sector.weight > 0 ? row.weight / sector.weight : 0;
        return sum + r * w;
      }, 0);
      const allocation = (sector.weight - benchWeight / sectors.length) * benchPeriod;
      const selection = (sector.weight) * (sectorRet - benchPeriod);
      return {
        sector: sector.name,
        weight: sector.weight,
        sectorRet,
        allocation,
        selection,
        interaction: allocation * (sectorRet - benchPeriod),
        total: allocation + selection,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function factorExposures(portfolio: VirtualPortfolio) {
  const rows = positionRows(portfolio);
  const total = rows.reduce((sum, row) => sum + row.marketValue, 0) + portfolio.cash;
  const acc = { mkt: 0, rates: 0, growth: 0, value: 0, cmdty: 0 };
  for (const row of rows) {
    const inst = getInstrument(row.symbol);
    const w = row.marketValue / total;
    acc.mkt += w * inst.betaMkt;
    acc.rates += w * inst.betaRates;
    acc.growth += w * inst.betaGrowth;
    acc.value += w * inst.betaValue;
    acc.cmdty += w * inst.betaCmdty;
  }
  return [
    { name: "Market", value: acc.mkt },
    { name: "Rates", value: acc.rates },
    { name: "Growth", value: acc.growth },
    { name: "Value", value: acc.value },
    { name: "Commodity", value: acc.cmdty },
  ];
}

export function riskContribution(portfolio: VirtualPortfolio) {
  const rows = positionRows(portfolio);
  const vols = rows.map((row) => stdev(getReturns(row.symbol)) * Math.sqrt(252));
  const weighted = rows.map((row, i) => row.weight * vols[i]!);
  const sum = weighted.reduce((a, b) => a + b, 0);
  return rows.map((row, i) => ({
    symbol: row.symbol,
    name: row.name,
    weight: row.weight,
    vol: vols[i]!,
    riskShare: weighted[i]! / Math.max(sum, 1e-9),
  }));
}
