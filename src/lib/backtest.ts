import { TRADING_DAYS } from "@/lib/calendar";
import { cagr, maxDrawdown, mean, returnsFromPrices, stdev } from "@/lib/analytics";
import { getPriceSeries } from "@/lib/market";

export type BacktestConfig = {
  name: string;
  symbols: string[];
  weights: number[];
  rebalance: "none" | "monthly" | "quarterly";
  start?: string;
};

export function runBacktest(config: BacktestConfig) {
  const startIdx = config.start ? Math.max(0, TRADING_DAYS.indexOf(config.start)) : 0;
  const dates = TRADING_DAYS.slice(startIdx);
  const series = config.symbols.map((symbol) => getPriceSeries(symbol).slice(startIdx));
  const weights = normalize(config.weights);
  let units = series.map((prices, i) => (weights[i]! * 1) / prices[0]!);
  const nav: { date: string; portfolio: number; equal: number }[] = [];
  const equalUnits = series.map((prices) => (1 / series.length) / prices[0]!);

  dates.forEach((date, i) => {
    if (i > 0 && shouldRebalance(date, config.rebalance)) {
      const value = units.reduce((sum, unit, j) => sum + unit * series[j]![i]!, 0);
      units = series.map((prices, j) => (weights[j]! * value) / prices[i]!);
    }
    const portfolio = units.reduce((sum, unit, j) => sum + unit * series[j]![i]!, 0);
    const equal = equalUnits.reduce((sum, unit, j) => sum + unit * series[j]![i]!, 0);
    nav.push({ date, portfolio, equal });
  });

  const port = nav.map((p) => p.portfolio);
  const eq = nav.map((p) => p.equal);
  const portR = returnsFromPrices(port);
  const rf = 0.045 / 252;
  return {
    nav,
    stats: {
      totalReturn: port[port.length - 1]! / port[0]! - 1,
      cagr: cagr(port),
      vol: stdev(portR) * Math.sqrt(252),
      sharpe: ((mean(portR) - rf) / Math.max(stdev(portR), 1e-12)) * Math.sqrt(252),
      maxDrawdown: maxDrawdown(port),
      vsEqual: port[port.length - 1]! / eq[eq.length - 1]! - 1,
    },
  };
}

function normalize(weights: number[]) {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  return weights.map((w) => w / sum);
}

function shouldRebalance(date: string, cadence: BacktestConfig["rebalance"]) {
  if (cadence === "none") return false;
  const d = new Date(`${date}T00:00:00Z`);
  if (cadence === "monthly") return d.getUTCDate() <= 3;
  return d.getUTCDate() <= 3 && [0, 3, 6, 9].includes(d.getUTCMonth());
}

export const STRATEGY_PRESETS: BacktestConfig[] = [
  {
    name: "60/40 Global",
    symbols: ["SPY", "EFA", "BND", "GLD"],
    weights: [0.42, 0.18, 0.32, 0.08],
    rebalance: "quarterly",
    start: "2019-01-02",
  },
  {
    name: "Quality Growth",
    symbols: ["MSFT", "AAPL", "GOOGL", "AMZN", "ASML"],
    weights: [0.24, 0.22, 0.18, 0.18, 0.18],
    rebalance: "monthly",
    start: "2019-01-02",
  },
  {
    name: "Risk Parity Lite",
    symbols: ["SPY", "TLT", "GLD", "DBC"],
    weights: [0.3, 0.35, 0.2, 0.15],
    rebalance: "monthly",
    start: "2019-01-02",
  },
];
