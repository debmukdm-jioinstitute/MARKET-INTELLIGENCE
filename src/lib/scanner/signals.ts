import { NIFTY_500 } from "../prowess/nifty500";
import { fetchDailyBars, fetchYahooBars } from "./data";
import { FNO_INDEX_OPTIONS, SIGNAL_HORIZON_OPTIONS } from "./fno-indices";
import { atr, computeIndicators, ema } from "./indicators";
import { buildFeatures, predict } from "./lorentzian";
import type { Bar, IndexSignalBlock, SignalBucket, SignalsRun, StockSignal } from "./types";

const BUY = 0.65;
const SELL = 0.35;
const NIFTY_TEST_DAYS = 750;
const STOCK_TEST_SESSIONS = 60;
const day = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);
const call = (p: number | null) => (p == null ? "Neutral" : p >= 0.6 ? "Bullish" : p <= 0.4 ? "Bearish" : "Neutral");

function indexBlockFromBars(bars: Bar[], evalHorizon: number): IndexSignalBlock | null {
  if (bars.length < 600) return null;
  const n = bars.length;
  const feats = buildFeatures(bars);
  const close = bars.map((b) => b.c);
  const e20 = ema(close, 20);
  const e50 = ema(close, 50);

  const t0 = Math.max(200, n - 1 - NIFTY_TEST_DAYS);
  const rows: { t: number; p: number; ret: number }[] = [];
  for (let t = t0; t < n - evalHorizon; t++) {
    const v = predict(bars, feats, t, { horizon: evalHorizon, k: 12, lookback: 1500 });
    if (v) rows.push({ t, p: v.pUp, ret: bars[t + evalHorizon].c / bars[t].c - 1 });
  }

  const upDays = rows.filter((r) => r.ret > 0).length;
  const correct = rows.filter((r) => (r.p >= 0.5) === r.ret > 0).length;
  const bucketDef: { label: string; test: (p: number) => boolean; dir: 1 | -1 | 0 }[] = [
    { label: "Strong up call (P ≥ 65%)", test: (p) => p >= 0.65, dir: 1 },
    { label: "Mild up call (55–65%)", test: (p) => p >= 0.55 && p < 0.65, dir: 1 },
    { label: "No call (45–55%)", test: (p) => p > 0.45 && p < 0.55, dir: 0 },
    { label: "Mild down call (35–45%)", test: (p) => p > 0.35 && p <= 0.45, dir: -1 },
    { label: "Strong down call (P ≤ 35%)", test: (p) => p <= 0.35, dir: -1 },
  ];
  const buckets: SignalBucket[] = bucketDef.map((b) => {
    const r = rows.filter((x) => b.test(x.p));
    if (!r.length) return { label: b.label, n: 0, hitRate: null, avgRet: null };
    const dirRet = r.map((x) => (b.dir === 0 ? x.ret : b.dir * x.ret) * 100);
    const hit = b.dir === 0 ? r.filter((x) => x.ret > 0).length : r.filter((x) => b.dir * x.ret > 0).length;
    return { label: b.label, n: r.length, hitRate: (hit / r.length) * 100, avgRet: dirRet.reduce((a, c) => a + c, 0) / r.length };
  });

  let strat = 10_000;
  let hold = 10_000;
  const equity = rows.map((r) => {
    const pos = r.p > 0.55 ? 1 : r.p < 0.45 ? -1 : 0;
    strat *= 1 + pos * r.ret;
    hold *= 1 + r.ret;
    return { d: day(bars[r.t + evalHorizon].t), strategy: Math.round(strat), buyHold: Math.round(hold) };
  });

  const vNow = predict(bars, feats, n - 1, { horizon: evalHorizon, k: 12, lookback: 1500 });
  const c = close[n - 1];
  const trend = c > e20[n - 1] && c > e50[n - 1] ? "Above 20 & 50 EMA (uptrend)" : c < e20[n - 1] && c < e50[n - 1] ? "Below 20 & 50 EMA (downtrend)" : "Between 20 & 50 EMA (mixed)";

  return {
    close: c,
    changePct: (c / close[n - 2] - 1) * 100,
    horizon: evalHorizon,
    pUp: vNow?.pUp ?? null,
    call: call(vNow?.pUp ?? null),
    ema20: e20[n - 1],
    ema50: e50[n - 1],
    trend,
    validation: {
      days: rows.length,
      from: rows.length ? day(bars[rows[0].t].t) : "",
      to: rows.length ? day(bars[rows[rows.length - 1].t + evalHorizon].t) : "",
      accuracy: rows.length ? (correct / rows.length) * 100 : 0,
      alwaysUp: rows.length ? (upDays / rows.length) * 100 : 0,
      buckets,
      strategyReturn: (strat / 10_000 - 1) * 100,
      buyHoldReturn: (hold / 10_000 - 1) * 100,
      equity: equity.filter((_, i) => i % 3 === 0 || i === equity.length - 1),
      recent: rows.slice(-15).reverse().map((r) => ({
        d: day(bars[r.t].t),
        pUp: r.p,
        call: r.p >= 0.5 ? "Up" : "Down",
        actual: r.ret > 0 ? "Up" : "Down",
        retPct: r.ret * 100,
      })),
    },
  };
}

function legacyNiftyFields(h1: IndexSignalBlock, h5: IndexSignalBlock | undefined): SignalsRun["nifty"] {
  return {
    ...h1,
    pUp1: h1.pUp,
    pUp5: h5?.pUp ?? null,
    call1: h1.call,
    call5: h5?.call ?? "Neutral",
  };
}

async function buildFnoIndices(): Promise<{ indices: SignalsRun["indices"]; lastBar: string; nifty: SignalsRun["nifty"] } | null> {
  const indices: SignalsRun["indices"] = {};
  let lastBar = "";

  await Promise.all(
    FNO_INDEX_OPTIONS.map(async (idx) => {
      const bars = await fetchYahooBars(idx.yahoo, "10y");
      if (!bars?.length) return;
      lastBar = day(bars[bars.length - 1].t);
      const horizons: Partial<Record<number, IndexSignalBlock>> = {};
      for (const h of SIGNAL_HORIZON_OPTIONS) {
        const block = indexBlockFromBars(bars, h.value);
        if (block) horizons[h.value] = block;
      }
      if (Object.keys(horizons).length) {
        indices[idx.id] = { label: idx.label, yahoo: idx.yahoo, horizons };
      }
    }),
  );

  const primary = indices.nifty50?.horizons[1];
  if (!primary) return null;
  const nifty = legacyNiftyFields(primary, indices.nifty50?.horizons[5]);
  return { indices, lastBar, nifty };
}

/** Next-session direction model for the Nifty 50 index, plus BTST/STBT candidates across the Nifty 500, each with walk-forward validation. */
export async function runSignals(opts: { symbols?: string[]; budgetMs?: number; concurrency?: number } = {}): Promise<SignalsRun | null> {
  const budgetMs = opts.budgetMs ?? 50_000;
  const concurrency = opts.concurrency ?? 12;
  const started = Date.now();
  const fno = await buildFnoIndices();
  if (!fno) return null;

  const universe = NIFTY_500.filter(([s]) => !opts.symbols || opts.symbols.includes(s));
  const cand: StockSignal[] = [];
  const agg = { buyN: 0, buyHit: 0, buySum: 0, sellN: 0, sellHit: 0, sellSum: 0, baseN: 0, baseUp: 0, baseSum: 0 };
  let scanned = 0;
  let i = 0;

  async function worker() {
    while (i < universe.length) {
      if (Date.now() - started > budgetMs) return;
      const [symbol, name, industry] = universe[i++];
      const bars = await fetchDailyBars(symbol, "2y");
      if (!bars || bars.length < 260) continue;
      scanned++;
      const n = bars.length;
      const feats = buildFeatures(bars);
      for (let t = Math.max(120, n - 1 - STOCK_TEST_SESSIONS); t < n - 1; t++) {
        const v = predict(bars, feats, t, { horizon: 1, k: 12, lookback: 480 });
        if (!v) continue;
        const ret = bars[t + 1].c / bars[t].c - 1;
        agg.baseN++;
        agg.baseSum += ret;
        if (ret > 0) agg.baseUp++;
        if (v.pUp >= BUY) {
          agg.buyN++;
          agg.buySum += ret;
          if (ret > 0) agg.buyHit++;
        } else if (v.pUp <= SELL) {
          agg.sellN++;
          agg.sellSum += -ret;
          if (ret < 0) agg.sellHit++;
        }
      }
      const v = predict(bars, feats, n - 1, { horizon: 1, k: 12, lookback: 480 });
      if (v && (v.pUp >= BUY || v.pUp <= SELL)) {
        const a = atr(bars, 14)[n - 1];
        const last = bars[n - 1];
        const long = v.pUp >= BUY;
        const ind = computeIndicators(bars);
        cand.push({
          symbol,
          name,
          industry,
          ltp: last.c,
          changePct: (last.c / bars[n - 2].c - 1) * 100,
          pUp: v.pUp,
          confidence: v.confidence,
          rsi: Number.isFinite(ind.rsi[n - 1]) ? ind.rsi[n - 1] : null,
          entry: last.c,
          target: long ? last.c + a : last.c - a,
          stop: long ? last.c - 0.75 * a : last.c + 0.75 * a,
        });
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  const pct = (x: number, n: number) => (n ? (x / n) * 100 : 0);
  return {
    asOf: new Date().toISOString(),
    lastBar: fno.lastBar,
    nifty: fno.nifty,
    indices: fno.indices,
    stocks: {
      universe: universe.length,
      scanned,
      validation: {
        sessions: STOCK_TEST_SESSIONS,
        buy: { n: agg.buyN, hitRate: pct(agg.buyHit, agg.buyN), avgRet: pct(agg.buySum, agg.buyN) },
        sell: { n: agg.sellN, hitRate: pct(agg.sellHit, agg.sellN), avgRet: pct(agg.sellSum, agg.sellN) },
        base: { n: agg.baseN, upRate: pct(agg.baseUp, agg.baseN), avgRet: pct(agg.baseSum, agg.baseN) },
      },
      btst: cand.filter((c) => c.pUp >= BUY).sort((a, b) => b.pUp - a.pUp).slice(0, 15),
      stbt: cand.filter((c) => c.pUp <= SELL).sort((a, b) => a.pUp - b.pUp).slice(0, 15),
    },
  };
}
