import type { Bar } from "@/lib/scanner/types";
import { fetchBars, resolveInstrument } from "./data";
import { adx, atr, bollinger, emaStd, macd, rsi, supertrend } from "./indicators";

export type StrategyId = "breakout" | "trend" | "pullback" | "meanrev";

export const STRATEGIES: { id: StrategyId; label: string; description: string; entry: string }[] = [
  { id: "breakout", label: "Breakout", description: "Price breaks resistance on strong volume in a trending market.", entry: "Close > prior 20-bar high AND volume ≥ 1.5× 20-bar average AND ADX(14) > 20" },
  { id: "trend", label: "Trend-following", description: "Ride established uptrends confirmed by momentum and Supertrend.", entry: "Close > EMA 50 AND MACD line > signal AND Supertrend(10,3) up — on the bar all three first align" },
  { id: "pullback", label: "Pullback", description: "Buy dips inside an intact uptrend once momentum recovers.", entry: "Close > EMA 50 AND RSI(14) crosses back above 40 after dipping below it" },
  { id: "meanrev", label: "Mean-reversion", description: "Fade stretched selloffs expecting a snap back toward the average.", entry: "Close below lower Bollinger Band(20,2) AND RSI(14) < 30" },
];

const MAX_HOLD = 10; // bars
const STOP_ATR = 2; // × ATR(14) below entry
const COST = 0.001; // 0.10% round trip (brokerage + slippage allowance)

export interface BacktestResult {
  symbol: string;
  strategy: StrategyId;
  entryRule: string;
  exitRule: string;
  period: { from: number; to: number; bars: number };
  trades: number;
  winRate: number | null;
  avgGainPct: number | null;
  avgLossPct: number | null;
  avgReturnPct: number | null;
  totalReturnPct: number;
  buyHoldPct: number;
  maxDrawdownPct: number;
  recent: { entryT: number; exitT: number; entry: number; exit: number; retPct: number; reason: "stop" | "time" }[];
  caveats: string[];
}

function signals(id: StrategyId, bars: Bar[]): boolean[] {
  const close = bars.map((b) => b.c);
  const n = bars.length;
  const out = Array<boolean>(n).fill(false);
  const fin = Number.isFinite;
  if (id === "breakout") {
    const a = adx(bars, 14).adx;
    for (let i = 21; i < n; i++) {
      let hh = -Infinity, vs = 0;
      for (let j = i - 20; j < i; j++) { hh = Math.max(hh, bars[j].h); vs += bars[j].v; }
      const vr = vs > 0 ? bars[i].v / (vs / 20) : NaN;
      out[i] = bars[i].c > hh && fin(vr) && vr >= 1.5 && fin(a[i]) && a[i] > 20;
    }
  } else if (id === "trend") {
    const e = emaStd(close, 50), m = macd(close), s = supertrend(bars, 10, 3);
    const state = (i: number) => fin(e[i]) && fin(m.line[i]) && fin(m.signal[i]) && close[i] > e[i] && m.line[i] > m.signal[i] && s.dir[i] === 1;
    for (let i = 1; i < n; i++) out[i] = state(i) && !state(i - 1);
  } else if (id === "pullback") {
    const e = emaStd(close, 50), r = rsi(close, 14);
    for (let i = 1; i < n; i++) out[i] = fin(e[i]) && fin(r[i - 1]) && fin(r[i]) && close[i] > e[i] && r[i - 1] < 40 && r[i] >= 40;
  } else {
    const bb = bollinger(close, 20, 2), r = rsi(close, 14);
    const state = (i: number) => fin(bb.lower[i]) && fin(r[i]) && close[i] < bb.lower[i] && r[i] < 30;
    for (let i = 1; i < n; i++) out[i] = state(i) && !state(i - 1);
  }
  return out;
}

export function runBacktest(symbol: string, id: StrategyId, bars: Bar[]): BacktestResult {
  const sig = signals(id, bars);
  const a = atr(bars, 14);
  const rets: number[] = [];
  const recent: BacktestResult["recent"] = [];
  let equity = 1, peak = 1, maxDD = 0;
  let i = 1;
  while (i < bars.length - 1) {
    if (!sig[i] || !Number.isFinite(a[i])) { i++; continue; }
    const entryIdx = i + 1; // enter next bar open — no look-ahead
    const entry = bars[entryIdx].o;
    const stop = entry - STOP_ATR * a[i];
    let exitIdx = Math.min(entryIdx + MAX_HOLD - 1, bars.length - 1);
    let exit = bars[exitIdx].c;
    let reason: "stop" | "time" = "time";
    for (let j = entryIdx; j <= exitIdx; j++) {
      if (bars[j].l <= stop) {
        exitIdx = j;
        exit = bars[j].o < stop ? bars[j].o : stop; // gap-down fills at the open
        reason = "stop";
        break;
      }
    }
    const ret = exit / entry - 1 - COST;
    rets.push(ret);
    equity *= 1 + ret;
    peak = Math.max(peak, equity);
    maxDD = Math.max(maxDD, (peak - equity) / peak);
    recent.push({ entryT: bars[entryIdx].t, exitT: bars[exitIdx].t, entry, exit, retPct: ret * 100, reason });
    i = exitIdx + 1; // non-overlapping trades
  }
  const wins = rets.filter((r) => r > 0), losses = rets.filter((r) => r <= 0);
  const mean = (xs: number[]) => (xs.length ? (xs.reduce((s, x) => s + x, 0) / xs.length) * 100 : null);
  const def = STRATEGIES.find((s) => s.id === id)!;
  return {
    symbol,
    strategy: id,
    entryRule: def.entry,
    exitRule: `Enter at next bar's open · exit at ${STOP_ATR}× ATR(14) stop or after ${MAX_HOLD} bars, whichever is first · 0.10% round-trip cost deducted · long only, one trade at a time`,
    period: { from: bars[0].t, to: bars[bars.length - 1].t, bars: bars.length },
    trades: rets.length,
    winRate: rets.length ? (wins.length / rets.length) * 100 : null,
    avgGainPct: mean(wins),
    avgLossPct: mean(losses),
    avgReturnPct: mean(rets),
    totalReturnPct: (equity - 1) * 100,
    buyHoldPct: (bars[bars.length - 1].c / bars[0].c - 1) * 100,
    maxDrawdownPct: maxDD * 100,
    recent: recent.slice(-8).reverse(),
    caveats: [
      "Past performance does not predict future returns.",
      "Daily bars, split-adjusted, not dividend-adjusted. Stop fills assume the stop price (or the open on a gap). No tax, no impact cost beyond the 0.10% allowance.",
      rets.length < 20 ? `Only ${rets.length} trades — too few to read a reliable win rate.` : "",
    ].filter(Boolean),
  };
}

export async function backtestSymbol(symbolRaw: string, id: StrategyId): Promise<BacktestResult | { error: string; status: number }> {
  const inst = resolveInstrument(symbolRaw);
  if (!inst) return { error: "Invalid symbol", status: 400 };
  const data = await fetchBars(inst, "1d");
  if (!data) return { error: `No daily data for ${inst.label}.`, status: 404 };
  if (id === "breakout" && !data.hasVolume) return { error: "Breakout needs volume; this instrument has none (index).", status: 422 };
  return runBacktest(inst.id, id, data.bars);
}
