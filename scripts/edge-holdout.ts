/**
 * Pre-registered check of ONE hypothesis on data the search never touched:
 *   "RSI(14) < 30 while price is above its 200-DMA" (buy the dip in an uptrend) earns excess return vs the same-day average stock.
 * Uses bars older than 2022-07-28 (the search used 2022-07-28 →). Survivorship bias FLATTERS dip-buying in older data
 * (stocks that kept falling were delisted and are missing), so a null here is conclusive but a positive is optimistic.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fetchDailyBars } from "../src/lib/scanner/data.ts";
import { computeIndicators } from "../src/lib/scanner/indicators.ts";
import { NIFTY_500 } from "../src/lib/prowess/nifty500.ts";
import type { Bar } from "../src/lib/scanner/types.ts";

const CUT = "2022-07-28";
const RECENT = process.env.RECENT === "1"; // RECENT=1 → evaluate 2022-07-28 onwards instead (already seen by the search)
const CACHE = ".research-cache/bars10y.json";
const HORIZONS = [1, 3, 5];
const COST = 0.3;
const day = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);

async function main() {
  let stocks: Record<string, Bar[]>;
  try {
    stocks = JSON.parse(await readFile(CACHE, "utf8"));
  } catch {
    stocks = {};
    const syms = NIFTY_500.map((r) => r[0]);
    let i = 0;
    await Promise.all(Array.from({ length: 16 }, async () => {
      while (i < syms.length) {
        const s = syms[i++];
        const b = await fetchDailyBars(s, "10y");
        if (b && b.length > 400) stocks[s] = b;
      }
    }));
    await mkdir(".research-cache", { recursive: true });
    await writeFile(CACHE, JSON.stringify(stocks));
  }
  console.log(`${Object.keys(stocks).length} stocks with 10y history`);

  const uSum = HORIZONS.map(() => new Map<string, number>());
  const uCnt = HORIZONS.map(() => new Map<string, number>());
  const events: { date: string; ex: number[] }[] = [];
  const pend: { date: string; fwd: number[] }[] = [];
  for (const bars of Object.values(stocks)) {
    const ind = computeIndicators(bars);
    for (let d = 210; d < bars.length - 6; d++) {
      const date = day(bars[d].t);
      if (RECENT ? date < CUT : date >= CUT) continue;
      const entry = bars[d + 1].o;
      if (!(entry > 0)) continue;
      const fwd = HORIZONS.map((h) => bars[d + h].c / entry - 1);
      HORIZONS.forEach((_, k) => {
        uSum[k].set(date, (uSum[k].get(date) ?? 0) + fwd[k]);
        uCnt[k].set(date, (uCnt[k].get(date) ?? 0) + 1);
      });
      if (ind.rsi[d] < 30 && bars[d].c > ind.sma200[d]) pend.push({ date, fwd });
    }
  }
  for (const p of pend) events.push({ date: p.date, ex: p.fwd.map((r, k) => r - uSum[k].get(p.date)! / uCnt[k].get(p.date)!) });

  const byDay = new Map<string, number[][]>();
  for (const e of events) {
    const a = byDay.get(e.date) ?? HORIZONS.map(() => []);
    e.ex.forEach((x, k) => a[k].push(x));
    byDay.set(e.date, a);
  }
  const dates = [...byDay.keys()].sort();
  console.log(`signals: ${events.length} over ${dates.length} days (${dates[0]} → ${dates[dates.length - 1]})`);
  HORIZONS.forEach((h, k) => {
    const x = dates.map((d) => byDay.get(d)![k].reduce((a, b) => a + b, 0) / byDay.get(d)![k].length);
    const m = x.length, mean = x.reduce((a, b) => a + b, 0) / m;
    const dev = x.map((v) => v - mean);
    const lag = h === 1 ? 1 : 5;
    let v = dev.reduce((a, b) => a + b * b, 0) / m;
    for (let l = 1; l <= lag; l++) {
      let c = 0;
      for (let i = l; i < m; i++) c += dev[i] * dev[i - l];
      v += 2 * (1 - l / (lag + 1)) * (c / m);
    }
    const t = mean / Math.sqrt(v / m);
    const win = events.filter((e) => e.ex[k] > 0).length / events.length;
    console.log(`h=${h}: mean excess ${(mean * 100).toFixed(3)}%  NW t=${t.toFixed(2)}  hit(excess>0)=${(win * 100).toFixed(1)}%  net of ${COST}% cost: ${(mean * 100 - COST).toFixed(2)}%`);
  });
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
