import { z } from "zod";
import { BACKTEST_UNIVERSE } from "./universe";
export { BACKTEST_UNIVERSE } from "./universe";
import { fetchBars, resolveInstrument } from "@/lib/trade-lab/data";
import { rsi, sma } from "@/lib/trade-lab/indicators";
import type { Bar } from "@/lib/scanner/types";
import { friction, FRICTION_RATE, STARTING_CAPITAL } from "./config";

export const backtestRule = z
  .object({
    condition: z.enum(["momentum", "rsi", "maCross"]),
    fast: z.number().int().min(2).max(100).default(20),
    slow: z.number().int().min(3).max(250).default(50),
    rsiThreshold: z.number().min(5).max(95).default(30),
    rsiPeriod: z.number().int().min(2).max(50).default(14),
    stopLoss: z.number().min(0.1).max(50).default(5),
    takeProfit: z.number().min(0.1).max(100).default(10),
  })
  .refine(
    (r) => r.fast < r.slow,
    "Fast moving average must be shorter than slow.",
  );
export type BacktestRule = z.infer<typeof backtestRule>;
export const backtestInput = z.object({
  symbols: z.array(z.string()).min(1).max(50),
  years: z.number().int().min(1).max(5),
  rule: backtestRule,
});
export type SandboxResult = {
  symbol: string;
  totalReturnPct: number;
  maxDrawdownPct: number;
  winRate: number | null;
  trades: number;
  equity: { t: number; value: number }[];
  from: number;
  to: number;
};

/** Daily marked equity, next-open entries and pessimistic stop before target when both touch. */
export function runSandbox(
  symbol: string,
  bars: Bar[],
  rule: BacktestRule,
): SandboxResult {
  if (bars.length < rule.slow + 2)
    throw new Error("Insufficient history for the configured rule.");
  const close = bars.map((b) => b.c),
    fast = sma(close, rule.fast),
    slow = sma(close, rule.slow),
    strength = rsi(close, rule.rsiPeriod);
  let cash = STARTING_CAPITAL,
    shares = 0,
    entry = 0,
    entryCost = 0,
    peak = STARTING_CAPITAL,
    drawdown = 0,
    trades = 0,
    wins = 0;
  const equity: SandboxResult["equity"] = [];
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    if (i > rule.slow && !shares) {
      const p = i - 1;
      const signal =
        rule.condition === "rsi"
          ? strength[p] < rule.rsiThreshold
          : rule.condition === "maCross"
            ? fast[p] > slow[p] && fast[p - 1] <= slow[p - 1]
            : close[p] > slow[p] && strength[p] > 50;
      if (signal) {
        shares = Math.floor(cash / (b.o * (1 + FRICTION_RATE)));
        while (shares > 0 && shares * b.o + friction(shares * b.o) > cash)
          shares--;
        if (shares) {
          entry = b.o;
          entryCost = shares * entry + friction(shares * entry);
          cash -= entryCost;
        }
      }
    }
    if (shares) {
      const stop = entry * (1 - rule.stopLoss / 100),
        target = entry * (1 + rule.takeProfit / 100);
      let exit: number | null = null;
      if (b.o <= stop) exit = b.o;
      else if (b.o >= target) exit = b.o;
      else if (b.l <= stop) exit = stop;
      else if (b.h >= target) exit = target;
      else if (i === bars.length - 1) exit = b.c;
      if (exit !== null) {
        const proceeds = shares * exit - friction(shares * exit);
        cash += proceeds;
        trades++;
        if (proceeds > entryCost) wins++;
        shares = 0;
      }
    }
    const value = cash + shares * b.c;
    peak = Math.max(peak, value);
    drawdown = Math.max(drawdown, (peak - value) / peak);
    equity.push({ t: b.t, value });
  }
  return {
    symbol,
    totalReturnPct: (cash / STARTING_CAPITAL - 1) * 100,
    maxDrawdownPct: drawdown * 100,
    winRate: trades ? (wins / trades) * 100 : null,
    trades,
    equity,
    from: bars[0].t,
    to: bars[bars.length - 1].t,
  };
}
const cache = new Map<
  string,
  {
    at: number;
    result: {
      results: SandboxResult[];
      unavailable: string[];
      elapsedMs: number;
    };
  }
>();
export async function sandbox(input: z.infer<typeof backtestInput>) {
  const unique = [...new Set(input.symbols)];
  if (unique.some((s) => !BACKTEST_UNIVERSE.includes(s)))
    return {
      error:
        "Choose symbols from the repository's Nifty 50 reference universe.",
    };
  const key = JSON.stringify({ ...input, symbols: unique.sort() });
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 300_000) return hit.result;
  const start = Date.now();
  const signal = AbortSignal.timeout(25_000);
  const settled = await Promise.allSettled(
    unique.map(async (symbol) => {
      // Reuse Trade Lab fetching. A range selects its existing Yahoo daily path (up to 5 years).
      const data = await fetchBars(
        resolveInstrument(symbol)!,
        "1d",
        `${input.years}y`,
        { signal, attempts: 1, timeoutMs: 4500 },
      );
      if (!data) throw new Error("Data unavailable");
      return runSandbox(symbol, data.bars, input.rule);
    }),
  );
  const results: SandboxResult[] = [],
    unavailable: string[] = [];
  settled.forEach((r, i) =>
    r.status === "fulfilled"
      ? results.push(r.value)
      : unavailable.push(unique[i]),
  );
  results.sort((a, b) => b.totalReturnPct - a.totalReturnPct);
  const result = { results, unavailable, elapsedMs: Date.now() - start };
  if (cache.size >= 20) cache.delete(cache.keys().next().value!);
  cache.set(key, { at: Date.now(), result });
  return result;
}
