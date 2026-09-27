import { NIFTY_500 } from "../prowess/nifty500";
import { fetchDailyBars, fetchYahooBars } from "./data";
import { FNO_INDEX_OPTIONS, SIGNAL_HORIZON_OPTIONS } from "./fno-indices";
import { fetchNseArchiveIndexBars } from "./nse-index-bars";
import { atr, computeIndicators } from "./indicators";
import { buildIndexSignalBlock } from "./ensemble-index-model";
import { buildFeatures, predict } from "./lorentzian";
import type { Bar, IndexSignalBlock, SignalsRun, StockSignal } from "./types";

const BUY = 0.65;
const SELL = 0.35;
const STOCK_TEST_SESSIONS = 60;
const day = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);
function indexBlockFromBars(bars: Bar[], evalHorizon: number) {
  return buildIndexSignalBlock(bars, evalHorizon);
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

async function fetchFnoIndexBars(idx: (typeof FNO_INDEX_OPTIONS)[number]): Promise<Bar[] | null> {
  let bars = await fetchYahooBars(idx.yahoo, "max");
  if (bars && bars.length >= 260) return bars;
  const archiveName = "nseArchiveName" in idx ? idx.nseArchiveName : undefined;
  if (archiveName) {
    bars = await fetchNseArchiveIndexBars(archiveName, 1300);
    if (bars && bars.length >= 260) return bars;
  }
  return null;
}

export async function buildFnoIndices(): Promise<{ indices: SignalsRun["indices"]; lastBar: string; nifty: SignalsRun["nifty"] } | null> {
  const indices: SignalsRun["indices"] = {};
  let lastBar = "";

  await Promise.all(
    FNO_INDEX_OPTIONS.map(async (idx) => {
      const bars = await fetchFnoIndexBars(idx);
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

const emptyStockPack = (): SignalsRun["stocks"] => ({
  universe: 0,
  scanned: 0,
  validation: {
    sessions: 0,
    buy: { n: 0, hitRate: 0, avgRet: 0 },
    sell: { n: 0, hitRate: 0, avgRet: 0 },
    base: { n: 0, upRate: 0, avgRet: 0 },
  },
  btst: [],
  stbt: [],
});

/** Next-session direction model for the Nifty 50 index, plus BTST/STBT candidates across the Nifty 500, each with walk-forward validation. */
export async function runSignals(
  opts: { symbols?: string[]; budgetMs?: number; concurrency?: number; indicesOnly?: boolean } = {},
): Promise<SignalsRun | null> {
  const budgetMs = opts.budgetMs ?? 50_000;
  const concurrency = opts.concurrency ?? 12;
  const started = Date.now();
  const fno = await buildFnoIndices();
  if (!fno) return null;

  if (opts.indicesOnly) {
    return {
      asOf: new Date().toISOString(),
      lastBar: fno.lastBar,
      nifty: fno.nifty,
      indices: fno.indices,
      stocks: emptyStockPack(),
    };
  }

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
