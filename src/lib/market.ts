import { LAST_DATE, PREV_DATE, TRADING_DAYS } from "@/lib/calendar";
import { gaussian, hashString, mulberry32 } from "@/lib/rng";
import type { MacroSeries } from "@/lib/types";
import { UNIVERSE } from "@/lib/universe";

type FactorState = {
  mkt: number;
  rates: number;
  growth: number;
  value: number;
  cmdty: number;
};

const FACTORS: FactorState[] = (() => {
  const rand = mulberry32(0x51a7e11);
  const state: FactorState[] = [];
  let mkt = 0;
  let rates = 0;
  let growth = 0;
  let value = 0;
  let cmdty = 0;
  for (let i = 0; i < TRADING_DAYS.length; i += 1) {
    const date = TRADING_DAYS[i]!;
    const shock = date.startsWith("2020-03")
      ? -0.018
      : date >= "2022-01-01" && date <= "2022-10-14"
        ? -0.0022
        : date >= "2023-11-01" && date <= "2024-06-30"
          ? 0.0018
          : 0;
    mkt = 0.08 * mkt + 0.0075 * gaussian(rand) + shock;
    rates = 0.12 * rates + 0.0022 * gaussian(rand) + (date.startsWith("2022") ? 0.0004 : 0);
    growth = 0.1 * growth + 0.004 * gaussian(rand) + (date >= "2023-01-01" ? 0.00035 : 0);
    value = 0.1 * value + 0.004 * gaussian(rand);
    cmdty = 0.12 * cmdty + 0.005 * gaussian(rand) + (date.startsWith("2022-03") ? 0.006 : 0);
    state.push({ mkt, rates, growth, value, cmdty });
  }
  return state;
})();

const PRICE_CACHE = new Map<string, number[]>();

export function getPriceSeries(symbol: string) {
  const cached = PRICE_CACHE.get(symbol);
  if (cached) return cached;
  const instrument = UNIVERSE.find((item) => item.symbol === symbol);
  if (!instrument) throw new Error(`Unknown symbol ${symbol}`);
  const rand = mulberry32(hashString(symbol));
  const prices: number[] = [];
  let price = instrument.startPrice;
  const dailyVol = instrument.vol / Math.sqrt(252);
  const dailyDrift = instrument.drift / 252;
  for (let i = 0; i < TRADING_DAYS.length; i += 1) {
    const f = FACTORS[i]!;
    const systematic =
      instrument.betaMkt * f.mkt +
      instrument.betaRates * f.rates +
      instrument.betaGrowth * f.growth +
      instrument.betaValue * f.value +
      instrument.betaCmdty * f.cmdty;
    const idio = dailyVol * 0.45 * gaussian(rand);
    const clipped = Math.max(-0.08, Math.min(0.08, dailyDrift + systematic + idio));
    price *= 1 + clipped;
    prices.push(Math.max(1, price));
  }
  PRICE_CACHE.set(symbol, prices);
  return prices;
}

export function getPrice(symbol: string, date = LAST_DATE) {
  const idx = TRADING_DAYS.indexOf(date);
  const series = getPriceSeries(symbol);
  return series[idx < 0 ? series.length - 1 : idx]!;
}

export function getReturn(symbol: string, lookbackDays = 1) {
  const series = getPriceSeries(symbol);
  const last = series[series.length - 1]!;
  const prev = series[Math.max(0, series.length - 1 - lookbackDays)]!;
  return last / prev - 1;
}

export function getReturns(symbol: string) {
  const prices = getPriceSeries(symbol);
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i += 1) {
    returns.push(prices[i]! / prices[i - 1]! - 1);
  }
  return returns;
}

export function alignedSeries(symbol: string, startDate?: string) {
  const start = startDate ? TRADING_DAYS.indexOf(startDate) : 0;
  const from = Math.max(0, start);
  return TRADING_DAYS.slice(from).map((date, i) => ({
    date,
    value: getPriceSeries(symbol)[from + i]!,
  }));
}

export function lastClose(symbol: string) {
  return getPrice(symbol, LAST_DATE);
}

export function prevClose(symbol: string) {
  return getPrice(symbol, PREV_DATE);
}

function rollingMacro(
  id: string,
  name: string,
  unit: string,
  seed: number,
  start: number,
  drift: number,
  vol: number,
  monthly = true,
): MacroSeries {
  const rand = mulberry32(seed);
  const points: MacroSeries["points"] = [];
  let level = start;
  TRADING_DAYS.forEach((date, i) => {
    if (!monthly || date.endsWith("-01") || i % 21 === 0) {
      level += drift + vol * gaussian(rand);
      points.push({ date, value: Number(level.toFixed(2)) });
    }
  });
  const latest = points[points.length - 1]!.value;
  const prev = points[points.length - 2]?.value ?? latest;
  return { id, name, unit, latest, change: latest - prev, points };
}

export const MACRO: MacroSeries[] = [
  rollingMacro("gdp", "US Real GDP Growth", "% y/y", 11, 2.4, 0.01, 0.12),
  rollingMacro("cpi", "US CPI", "% y/y", 12, 1.9, 0.015, 0.09),
  rollingMacro("unemp", "Unemployment Rate", "%", 13, 3.8, 0.002, 0.04),
  rollingMacro("fed", "Fed Funds Effective", "%", 14, 2.4, 0.01, 0.08),
  rollingMacro("ust10", "US 10Y Yield", "%", 15, 2.7, 0.008, 0.07),
  rollingMacro("dxy", "DXY Dollar Index", "idx", 16, 96, 0.02, 0.35),
  rollingMacro("vix", "VIX", "idx", 17, 16, 0, 0.9),
  rollingMacro("oil", "Brent Crude", "$/bbl", 18, 64, 0.04, 1.4),
  rollingMacro("gold", "Gold Spot", "$/oz", 19, 1480, 0.8, 8),
];

export function marketTape() {
  return UNIVERSE.filter((item) =>
    ["SPY", "QQQ", "TLT", "GLD", "USO", "UUP", "HYG", "EEM", "NVDA", "AAPL"].includes(
      item.symbol,
    ),
  ).map((item) => ({
    symbol: item.symbol,
    name: item.name,
    last: lastClose(item.symbol),
    chg: getReturn(item.symbol, 1),
    ytd: getReturn(item.symbol, 188),
  }));
}
