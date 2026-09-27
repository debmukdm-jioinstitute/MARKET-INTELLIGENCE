import { getFnoIndex, parseSignalHorizon, pickIndexSignal, type FnoIndexId, type SignalHorizon } from "./fno-indices";
import { loadSignals, saveSignals } from "./store";
import { buildFnoIndices } from "./signals";
import type { IndexSignalBlock, SignalsRun } from "./types";

/** Merge fresh F&O index packs into a stored run (keeps stock tables when present). */
export function mergeFnoIntoRun(prev: SignalsRun | null, fno: Awaited<ReturnType<typeof buildFnoIndices>>): SignalsRun {
  if (!fno) throw new Error("F&O index build failed");
  return {
    asOf: new Date().toISOString(),
    lastBar: fno.lastBar,
    nifty: fno.nifty,
    indices: { ...prev?.indices, ...fno.indices },
    stocks: prev?.stocks ?? {
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
    },
  };
}

export async function loadOrBuildIndexModel(indexId: string, horizonRaw: string | null): Promise<{
  run: SignalsRun | null;
  model: IndexSignalBlock | null;
  indexLabel: string;
  horizon: SignalHorizon;
}> {
  const idx = getFnoIndex(indexId);
  const horizon = parseSignalHorizon(horizonRaw);
  let run = await loadSignals().catch(() => null);
  let model = run ? pickIndexSignal(run, idx.id, horizon) : null;

  if (!model) {
    const fno = await buildFnoIndices();
    if (fno) {
      run = mergeFnoIntoRun(run, fno);
      await saveSignals(run).catch(() => {});
      model = pickIndexSignal(run, idx.id, horizon);
    }
  }

  return { run, model, indexLabel: idx.label, horizon };
}

export type { FnoIndexId };
