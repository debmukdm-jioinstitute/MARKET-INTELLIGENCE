import type { BenchmarkId } from "@/lib/my-portfolio/benchmark-options";
import { loadBenchmarkWeights, type BenchmarkWeightsRow } from "@/lib/my-portfolio/benchmark-weights-store";
import { refreshBenchmarkWeights } from "@/lib/my-portfolio/refresh-benchmark-weights";

const MEMORY_TTL_MS = 6 * 60 * 60_000;
const STALE_MS = 26 * 60 * 60_000;
const FIRST_LOAD_WAIT_MS = 25_000;

const memory = new Map<BenchmarkId, { row: BenchmarkWeightsRow; at: number }>();
const inflight = new Map<BenchmarkId, Promise<BenchmarkWeightsRow | null>>();

/** Honest empty answer: no live source produced weights, so active share and Brinson show N/A. */
function unavailable(benchmark: BenchmarkId): BenchmarkWeightsRow {
  return {
    benchmark,
    weights: {},
    asOf: "",
    sourceUrl: "",
    method: "unavailable",
    fetchedAt: new Date().toISOString(),
  };
}

function isFresh(row: BenchmarkWeightsRow, maxAgeMs: number): boolean {
  const t = Date.parse(row.fetchedAt);
  return Number.isFinite(t) && Date.now() - t < maxAgeMs;
}

function refreshOne(benchmark: BenchmarkId): Promise<BenchmarkWeightsRow | null> {
  const existing = inflight.get(benchmark);
  if (existing) return existing;
  const job = (async () => {
    try {
      const live = await refreshBenchmarkWeights(benchmark);
      if (live?.weights && Object.keys(live.weights).length) {
        memory.set(benchmark, { row: live, at: Date.now() });
        return live;
      }
    } catch {
      // unavailable below
    }
    return null;
  })().finally(() => inflight.delete(benchmark));
  inflight.set(benchmark, job);
  return job;
}

/** Live NSE/BSE constituent list x market cap (DB-backed, cron-refreshed). Never a hard-coded snapshot. */
export async function getBenchmarkWeightsSnapshot(benchmark: BenchmarkId): Promise<BenchmarkWeightsRow> {
  const cached = memory.get(benchmark);
  if (cached && Date.now() - cached.at < MEMORY_TTL_MS) return cached.row;

  const db = await loadBenchmarkWeights(benchmark);
  if (db?.weights && Object.keys(db.weights).length) {
    memory.set(benchmark, { row: db, at: Date.now() });
    if (!isFresh(db, STALE_MS)) void refreshOne(benchmark);
    return db;
  }

  // Nothing stored yet: wait (bounded) for the first live computation instead of showing a made-up basket.
  const live = await Promise.race([refreshOne(benchmark), new Promise<null>((r) => setTimeout(() => r(null), FIRST_LOAD_WAIT_MS))]);
  return live ?? unavailable(benchmark);
}

export async function getBenchmarkStockWeights(benchmark: BenchmarkId): Promise<Record<string, number>> {
  const snap = await getBenchmarkWeightsSnapshot(benchmark);
  return snap.weights;
}

export async function getBenchmarkSnapshotDate(benchmark: BenchmarkId): Promise<string> {
  const snap = await getBenchmarkWeightsSnapshot(benchmark);
  return snap.asOf;
}
