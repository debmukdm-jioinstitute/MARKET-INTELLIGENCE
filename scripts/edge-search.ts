/**
 * Edge search: does any scanner (or scanner + filter / scanner pair) beat the average stock, out of sample?
 *   npx tsx scripts/edge-search.ts
 * Method: 5y of Nifty 500 daily bars. Signal at close d → enter open d+1 → exit close d+h. Returns are measured
 * RELATIVE to the same-day equal-weight universe average for the same horizon (removes market beta/regime).
 * Rules are ranked on the first 60% of dates (train) and judged on the last 40% (test) with Newey-West t-stats on
 * per-day mean excess returns and a Bonferroni threshold over the number of rules carried to the test.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fetchYahooBars, fetchDailyBars } from "../src/lib/scanner/data.ts";
import { computeIndicators } from "../src/lib/scanner/indicators.ts";
import { SCANNERS } from "../src/lib/scanner/scanners.ts";
import { NIFTY_500 } from "../src/lib/prowess/nifty500.ts";
import type { Bar } from "../src/lib/scanner/types.ts";

const CACHE = ".research-cache/bars5y.json";
const HORIZONS = [1, 5];
const COST = 0.3; // % round trip, delivery equity incl. STT + slippage
const WARMUP = 210;
const day = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);

async function loadBars(): Promise<{ nifty: Bar[]; stocks: Record<string, Bar[]> }> {
  try {
    return JSON.parse(await readFile(CACHE, "utf8"));
  } catch {
    /* fetch */
  }
  const nifty = (await fetchYahooBars("^NSEI", "5y")) ?? [];
  const stocks: Record<string, Bar[]> = {};
  const syms = NIFTY_500.map((r) => r[0]);
  let i = 0;
  await Promise.all(
    Array.from({ length: 16 }, async () => {
      while (i < syms.length) {
        const s = syms[i++];
        const b = await fetchDailyBars(s, "5y");
        if (b && b.length > WARMUP + 60) stocks[s] = b;
      }
    }),
  );
  await mkdir(".research-cache", { recursive: true });
  await writeFile(CACHE, JSON.stringify({ nifty, stocks }));
  return { nifty, stocks };
}

// ---- filters (evaluated per stock-day) ----
const FILTERS: { id: string; label: string }[] = [
  { id: "any", label: "no filter" },
  { id: "vol1.5", label: "volume ≥ 1.5× avg" },
  { id: "above200", label: "above 200-DMA" },
  { id: "below200", label: "below 200-DMA" },
  { id: "mktUp", label: "Nifty above its 200-DMA" },
  { id: "mktDown", label: "Nifty below its 200-DMA" },
  { id: "rsiLow", label: "RSI < 50" },
  { id: "rsiHigh", label: "RSI ≥ 50" },
  { id: "hiVol", label: "ATR% > 3" },
  { id: "loVol", label: "ATR% < 2" },
  { id: "liquid", label: "20d turnover ≥ ₹10 cr" },
];

interface Prep {
  n: number;
  dateId: Int32Array;
  sig: Uint8Array[]; // per scanner
  filt: Uint8Array[]; // per filter
  fwd: Float64Array[]; // per horizon, as fraction
}

async function main() {
  const { nifty, stocks } = await loadBars();
  console.log(`bars: ${Object.keys(stocks).length} stocks, nifty ${nifty.length} bars`);

  // global date index from the Nifty series
  const dates = nifty.map((b) => day(b.t));
  const dIdx = new Map(dates.map((d, i) => [d, i]));
  const nIdxClose = nifty.map((b) => b.c);
  const nSma200 = computeIndicators(nifty).sma200;
  const mktUp = new Uint8Array(dates.length).map((_, i) => (nIdxClose[i] > nSma200[i] ? 1 : 0));
  const mktKnown = new Uint8Array(dates.length).map((_, i) => (Number.isFinite(nSma200[i]) ? 1 : 0));

  // pass 1: signals, filters, forward returns, universe means
  const preps: Prep[] = [];
  const uSum = HORIZONS.map(() => new Float64Array(dates.length));
  const uCnt = HORIZONS.map(() => new Int32Array(dates.length));
  for (const bars of Object.values(stocks)) {
    const n = bars.length;
    const ind = computeIndicators(bars);
    const dateId = new Int32Array(n).fill(-1);
    for (let d = 0; d < n; d++) dateId[d] = dIdx.get(day(bars[d].t)) ?? -1;
    const sig = SCANNERS.map(() => new Uint8Array(n));
    const filt = FILTERS.map(() => new Uint8Array(n));
    const fwd = HORIZONS.map(() => new Float64Array(n).fill(NaN));
    for (let d = WARMUP; d < n - 1; d++) {
      const id = dateId[d];
      if (id < 0) continue;
      const entry = bars[d + 1].o;
      if (!(entry > 0)) continue;
      HORIZONS.forEach((h, k) => {
        if (d + h < n) {
          const r = bars[d + h].c / entry - 1;
          fwd[k][d] = r;
          uSum[k][id] += r;
          uCnt[k][id]++;
        }
      });
      for (let s = 0; s < SCANNERS.length; s++) {
        try {
          if (SCANNERS[s].test(bars, ind, d)) sig[s][d] = 1;
        } catch {
          /* ignore */
        }
      }
      const c = bars[d].c;
      const volR = bars[d].v / ind.volAvg20[d - 1];
      const atrPct = (ind.atr[d] / c) * 100;
      const turnover = (ind.volAvg20[d] * c) / 1e7;
      filt[0][d] = 1;
      filt[1][d] = volR >= 1.5 ? 1 : 0;
      filt[2][d] = c > ind.sma200[d] ? 1 : 0;
      filt[3][d] = c < ind.sma200[d] ? 1 : 0;
      filt[4][d] = mktKnown[id] && mktUp[id] ? 1 : 0;
      filt[5][d] = mktKnown[id] && !mktUp[id] ? 1 : 0;
      filt[6][d] = ind.rsi[d] < 50 ? 1 : 0;
      filt[7][d] = ind.rsi[d] >= 50 ? 1 : 0;
      filt[8][d] = atrPct > 3 ? 1 : 0;
      filt[9][d] = atrPct < 2 ? 1 : 0;
      filt[10][d] = turnover >= 10 ? 1 : 0;
    }
    preps.push({ n, dateId, sig, filt, fwd });
  }

  // train/test split on dates that have forward data
  const usable = dates.map((_, i) => i).filter((i) => uCnt[0][i] > 100 && i >= WARMUP);
  const splitAt = usable[Math.floor(usable.length * 0.6)];
  console.log(`dates ${dates[usable[0]]} → ${dates[usable[usable.length - 1]]}; train < ${dates[splitAt]} ≤ test`);

  // rules
  type Rule = { name: string; a: number; b: number; bIsFilter: boolean };
  const rules: Rule[] = [];
  for (let a = 0; a < SCANNERS.length; a++) {
    for (let f = 0; f < FILTERS.length; f++) rules.push({ name: f === 0 ? SCANNERS[a].label : `${SCANNERS[a].label} + ${FILTERS[f].label}`, a, b: f, bIsFilter: true });
    for (let b = a + 1; b < SCANNERS.length; b++) rules.push({ name: `${SCANNERS[a].label} + ${SCANNERS[b].label}`, a, b, bIsFilter: false });
  }
  console.log(`${rules.length} rules × ${HORIZONS.length} horizons = ${rules.length * HORIZONS.length} hypotheses`);

  // pass 2: per-date excess sums per rule/horizon
  const D = dates.length;
  type Acc = { sum: Float64Array; cnt: Int32Array }[]; // per horizon
  const accs: Acc[] = rules.map(() => HORIZONS.map(() => ({ sum: new Float64Array(D), cnt: new Int32Array(D) })));
  for (const p of preps) {
    for (let d = WARMUP; d < p.n - 1; d++) {
      const id = p.dateId[d];
      if (id < 0 || Number.isNaN(p.fwd[0][d])) continue;
      const ex = HORIZONS.map((_, k) => (Number.isNaN(p.fwd[k][d]) || !uCnt[k][id] ? NaN : p.fwd[k][d] - uSum[k][id] / uCnt[k][id]));
      for (let r = 0; r < rules.length; r++) {
        const R = rules[r];
        if (!p.sig[R.a][d]) continue;
        if (!(R.bIsFilter ? p.filt[R.b][d] : p.sig[R.b][d])) continue;
        for (let k = 0; k < HORIZONS.length; k++) {
          if (Number.isNaN(ex[k])) continue;
          accs[r][k].sum[id] += ex[k];
          accs[r][k].cnt[id]++;
        }
      }
    }
  }

  // stats: per-day mean excess series → mean, Newey-West t
  function stats(acc: { sum: Float64Array; cnt: Int32Array }, from: number, to: number, lag: number) {
    const x: number[] = [];
    let signals = 0;
    for (let i = from; i < to; i++) {
      if (acc.cnt[i] > 0) {
        x.push(acc.sum[i] / acc.cnt[i]);
        signals += acc.cnt[i];
      }
    }
    const m = x.length;
    if (m < 30) return null;
    const mean = x.reduce((a, b) => a + b, 0) / m;
    const dev = x.map((v) => v - mean);
    let v = dev.reduce((a, b) => a + b * b, 0) / m;
    for (let l = 1; l <= lag; l++) {
      let cov = 0;
      for (let i = l; i < m; i++) cov += dev[i] * dev[i - l];
      v += 2 * (1 - l / (lag + 1)) * (cov / m);
    }
    const se = Math.sqrt(Math.max(v, 1e-18) / m);
    return { mean: mean * 100, t: mean / se, days: m, signals };
  }

  const first = usable[0];
  const last = usable[usable.length - 1] + 1;
  const rows: { rule: string; h: number; train: NonNullable<ReturnType<typeof stats>>; test: ReturnType<typeof stats> }[] = [];
  rules.forEach((R, r) =>
    HORIZONS.forEach((h, k) => {
      const lag = h === 1 ? 1 : 5;
      const tr = stats(accs[r][k], first, splitAt, lag);
      if (!tr || tr.signals < 400) return;
      rows.push({ rule: R.name, h, train: tr, test: stats(accs[r][k], splitAt, last, lag) });
    }),
  );
  console.log(`${rows.length} rule/horizon pairs had enough training signals`);

  // baseline sanity: how many 'significant' rules would pure chance give? (train |t|>2)
  const sigTrain = rows.filter((r) => Math.abs(r.train.t) > 2).length;
  console.log(`train |t|>2: ${sigTrain} of ${rows.length} (chance alone would give ~${(rows.length * 0.05).toFixed(0)})`);

  // carry the 40 best by |train t| to the untouched test period
  const carried = [...rows].sort((a, b) => Math.abs(b.train.t) - Math.abs(a.train.t)).slice(0, 40);
  const bonf = 3.0; // ≈ two-sided p<0.05 across 40 carried rules
  console.log(`\nCarried 40 rules to the test period (Bonferroni |t| threshold ≈ ${bonf}); cost ${COST}% per trade\n`);
  console.log("rule".padEnd(64), "h", "trainEx%", "trainT", "|", "testEx%", "testT", "signals", "sameSign", "netOfCost");
  const out: unknown[] = [];
  for (const r of carried) {
    const te = r.test;
    if (!te) continue;
    const same = Math.sign(te.mean) === Math.sign(r.train.mean);
    const net = same ? Math.abs(te.mean) - COST : -Math.abs(te.mean) - COST;
    console.log(r.rule.slice(0, 63).padEnd(64), r.h, r.train.mean.toFixed(2).padStart(7), r.train.t.toFixed(1).padStart(6), "|", te.mean.toFixed(2).padStart(7), te.t.toFixed(1).padStart(5), String(te.signals).padStart(7), same ? "yes" : "NO ", net.toFixed(2).padStart(7), same && Math.abs(te.t) >= bonf ? "  <== survives" : "");
    out.push({ ...r, sameSign: same, netOfCost: net, survives: same && Math.abs(te.t) >= bonf });
  }
  const survivors = (out as { survives: boolean }[]).filter((o) => o.survives).length;
  console.log(`\nSurvivors (same sign & |test t| ≥ ${bonf}): ${survivors} of ${carried.length}`);
  await writeFile(".research-cache/edge.json", JSON.stringify(out, null, 1));
}

main().then(() => process.exit(0), (e) => {
  console.error(e);
  process.exit(1);
});
