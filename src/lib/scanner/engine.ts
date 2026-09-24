import { NIFTY_500 } from "../prowess/nifty500";
import { fetchDailyBars } from "./data";
import { computeIndicators } from "./indicators";
import { SCANNERS } from "./scanners";
import type { ScanRow, ScanRun } from "./types";

const MIN_BARS = 60;

/** Scan the Nifty 500 universe (or a subset) with every scanner. Time-boxed; unfinished symbols count as failed. */
export async function runScan(opts: { symbols?: string[]; budgetMs?: number; concurrency?: number } = {}): Promise<ScanRun> {
  const budgetMs = opts.budgetMs ?? 50_000;
  const concurrency = opts.concurrency ?? 16;
  const universe = NIFTY_500.filter(([s]) => !opts.symbols || opts.symbols.includes(s));
  const started = Date.now();

  const scanners: Record<string, ScanRow[]> = Object.fromEntries(SCANNERS.map((s) => [s.id, [] as ScanRow[]]));
  let scanned = 0;
  let failed = 0;
  let lastBarT = 0;
  let i = 0;

  async function worker() {
    while (i < universe.length) {
      if (Date.now() - started > budgetMs) return;
      const [symbol, name, industry] = universe[i++];
      const bars = await fetchDailyBars(symbol);
      if (!bars || bars.length < MIN_BARS) {
        failed++;
        continue;
      }
      scanned++;
      const ind = computeIndicators(bars);
      const b = bars[bars.length - 1];
      lastBarT = Math.max(lastBarT, b.t);
      const avg = ind.volAvg20[ind.volAvg20.length - 2];
      const base: Omit<ScanRow, "note"> = {
        symbol,
        name,
        industry,
        ltp: b.c,
        changePct: ((b.c - bars[bars.length - 2].c) / bars[bars.length - 2].c) * 100,
        volume: b.v,
        volRatio: avg > 0 ? b.v / avg : 0,
        rsi: Number.isFinite(ind.rsi[ind.rsi.length - 1]) ? ind.rsi[ind.rsi.length - 1] : null,
      };
      for (const s of SCANNERS) {
        try {
          const note = s.test(bars, ind, bars.length - 1);
          if (note) scanners[s.id].push({ ...base, note });
        } catch {
          /* a scanner failing on one symbol must not stop the rest */
        }
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  for (const rows of Object.values(scanners)) rows.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  return {
    asOf: new Date().toISOString(),
    lastBar: lastBarT ? new Date(lastBarT * 1000).toISOString().slice(0, 10) : "",
    universe: universe.length,
    scanned,
    failed: universe.length - scanned,
    scanners,
  };
}
