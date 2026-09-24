import { clearFailure, markFailure, saveSeries } from "./store";
import type { Collector } from "./types";
import { amfi } from "./sources/amfi";
import { bls } from "./sources/bls";
import { cboeVix } from "./sources/cboe";
import { cftc } from "./sources/cftc";
import { damodaran } from "./sources/damodaran";
import { ecb } from "./sources/ecb";
import { fredReserves } from "./sources/fred-reserves";
import { rbi } from "./sources/rbi";
import { rbiMarket } from "./sources/rbi-market";

export const COLLECTORS: Collector[] = [rbi, rbiMarket, fredReserves, cboeVix, cftc, bls, ecb, amfi, damodaran];

export type RunReport = { collector: string; ok: boolean; series: number; points: number; error?: string; ms: number; sample?: unknown };

/** Runs collectors independently: one failing source never blocks or overwrites the others. */
export async function runCollectors(only?: string[], dry = false): Promise<RunReport[]> {
  const list = only?.length ? COLLECTORS.filter((c) => only.includes(c.id)) : COLLECTORS;
  return Promise.all(
    list.map(async (c) => {
      const t0 = Date.now();
      try {
        const results = await c.run();
        let points = 0;
        for (const r of results) points += dry ? r.obs.length : await saveSeries(r);
        if (!dry) await clearFailure(c.id).catch(() => {});
        if (dry) return { collector: c.id, ok: true, series: results.length, points, ms: Date.now() - t0, sample: results.map((r) => ({ id: r.id, n: r.obs.length, last: r.obs[r.obs.length - 1] })) } as RunReport;
        return { collector: c.id, ok: true, series: results.length, points, ms: Date.now() - t0 };
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        if (!dry) await markFailure(`collector:${c.id}`, c.id, "", error).catch(() => {});
        return { collector: c.id, ok: false, series: 0, points: 0, error, ms: Date.now() - t0 };
      }
    }),
  );
}
