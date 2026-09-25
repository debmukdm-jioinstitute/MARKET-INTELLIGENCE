import { NIFTY_500 } from "../prowess/nifty500";
import { fetchDailyBars } from "./data";
import { computeIndicators } from "./indicators";
import { SCANNERS } from "./scanners";
import type { BacktestRun, BacktestScanner, Bar, HorizonStats } from "./types";

const HORIZONS = [1, 3, 5, 10];
const WARMUP = 60;
const START = 10_000;

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const day = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);

/**
 * Event backtest of every scanner over ~2 years of Nifty 500 daily bars.
 * A signal on session d (decided on data through d's close) is entered at session d+1's OPEN and exited at the close of
 * session d+N — no look-ahead. Sell-bias scanners are scored as shorts. Returns are gross (no brokerage, taxes or slippage).
 * `bench` is the average return of every stock on every session over the same horizon, so `edge` shows what the signal adds.
 */
export async function runBacktest(opts: { symbols?: string[]; budgetMs?: number; concurrency?: number } = {}): Promise<BacktestRun> {
  const budgetMs = opts.budgetMs ?? 50_000;
  const concurrency = opts.concurrency ?? 16;
  const universe = NIFTY_500.filter(([s]) => !opts.symbols || opts.symbols.includes(s));
  const started = Date.now();

  // per scanner: forward returns by horizon (raw, long-side), and per-date next-session returns for the equity curve
  const rets = SCANNERS.map(() => HORIZONS.map(() => [] as number[]));
  const benchSum = HORIZONS.map(() => 0);
  const benchN = HORIZONS.map(() => 0);
  const daily = SCANNERS.map(() => new Map<string, { sum: number; n: number }>());
  const benchDaily = new Map<string, { sum: number; n: number }>();
  let symbolsDone = 0;
  let minT = Infinity;
  let maxT = 0;
  let i = 0;

  async function worker() {
    while (i < universe.length) {
      if (Date.now() - started > budgetMs) return;
      const [symbol] = universe[i++];
      const bars = await fetchDailyBars(symbol, "2y");
      if (!bars || bars.length < WARMUP + 20) continue;
      symbolsDone++;
      const ind = computeIndicators(bars);
      const n = bars.length;
      minT = Math.min(minT, bars[0].t);
      maxT = Math.max(maxT, bars[n - 1].t);
      for (let d = WARMUP; d < n - 1; d++) {
        const entry = bars[d + 1].o;
        if (!(entry > 0)) continue;
        const fwd = HORIZONS.map((h) => (d + h < n ? bars[d + h].c / entry - 1 : NaN));
        const next = bars[d + 1].c / entry - 1; // next-session open→close, used for the equity curve
        const date = day(bars[d].t);
        HORIZONS.forEach((_, k) => {
          if (Number.isFinite(fwd[k])) {
            benchSum[k] += fwd[k];
            benchN[k]++;
          }
        });
        const bd = benchDaily.get(date) ?? { sum: 0, n: 0 };
        bd.sum += next;
        bd.n++;
        benchDaily.set(date, bd);
        for (let s = 0; s < SCANNERS.length; s++) {
          let hit: string | null = null;
          try {
            hit = SCANNERS[s].test(bars, ind, d);
          } catch {
            hit = null;
          }
          if (!hit) continue;
          HORIZONS.forEach((_, k) => Number.isFinite(fwd[k]) && rets[s][k].push(fwd[k]));
          const dd = daily[s].get(date) ?? { sum: 0, n: 0 };
          dd.sum += next;
          dd.n++;
          daily[s].set(date, dd);
        }
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  const curve = (m: Map<string, { sum: number; n: number }>, sign: number, dates: string[]) => {
    let v = START;
    return dates.map((d) => {
      const x = m.get(d);
      if (x && x.n) v *= 1 + (sign * x.sum) / x.n;
      return { d, v: Math.round(v) };
    });
  };
  const dates = [...benchDaily.keys()].sort();

  const scanners: BacktestScanner[] = SCANNERS.map((sc, s) => {
    const sign = sc.bias === "sell" ? -1 : 1;
    const horizons: HorizonStats[] = HORIZONS.map((days, k) => {
      const r = rets[s][k].map((x) => sign * x * 100);
      const bench = (benchN[k] ? (sign * benchSum[k]) / benchN[k] : 0) * 100;
      const avg = r.length ? r.reduce((a, b) => a + b, 0) / r.length : 0;
      return {
        days,
        signals: r.length,
        winRate: r.length ? (r.filter((x) => x > 0).length / r.length) * 100 : 0,
        avgRet: avg,
        medRet: r.length ? median(r) : 0,
        bench,
        edge: avg - bench,
        worst: r.length ? Math.min(...r) : 0,
        best: r.length ? Math.max(...r) : 0,
      };
    });
    return { id: sc.id, label: sc.label, bias: sc.bias, horizons, equity: curve(daily[s], sign, dates) };
  });

  return {
    asOf: new Date().toISOString(),
    from: minT === Infinity ? "" : day(minT),
    to: maxT ? day(maxT) : "",
    symbols: symbolsDone,
    sessions: dates.length,
    method:
      "Signal at a session's close → enter next session's open → exit at the close N sessions later (equity curve: open→close of the next session, all signals equally weighted, compounded daily). Sell scanners are scored as shorts. Gross of costs.",
    benchmarkEquity: curve(benchDaily, 1, dates),
    scanners,
  };
}
export type { Bar };
