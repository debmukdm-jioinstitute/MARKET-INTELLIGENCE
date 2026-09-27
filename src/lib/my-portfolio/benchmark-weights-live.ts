import type { BenchmarkId } from "@/lib/my-portfolio/benchmark-options";
import { benchmarkStockWeights } from "@/lib/my-portfolio/benchmark-constituents";
import { loadBenchmarkWeights, type BenchmarkWeightsRow } from "@/lib/my-portfolio/benchmark-weights-store";
import { refreshBenchmarkWeights } from "@/lib/my-portfolio/refresh-benchmark-weights";

const MEMORY_TTL_MS = 6 * 60 * 60_000;
const STALE_MS = 26 * 60 * 60_000;

const memory = new Map<BenchmarkId, { row: BenchmarkWeightsRow; at: number }>();
const inflight = new Map<BenchmarkId, Promise<BenchmarkWeightsRow>>();

function fromStatic(benchmark: BenchmarkId): BenchmarkWeightsRow {
  return {
    benchmark,
    weights: benchmarkStockWeights(benchmark),
    asOf: "2026-06-01",
    sourceUrl: "static:fallback-snapshot",
    method: "static_fallback",
    fetchedAt: new Date().toISOString(),
  };
}

function isFresh(row: BenchmarkWeightsRow, maxAgeMs: number): boolean {
  const t = Date.parse(row.fetchedAt);
  return Number.isFinite(t) && Date.now() - t < maxAgeMs;
}

async function refreshOne(benchmark: BenchmarkId): Promise<BenchmarkWeightsRow> {
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
      // fall through
    }
    const db = await loadBenchmarkWeights(benchmark);
    if (db?.weights && Object.keys(db.weights).length) {
      memory.set(benchmark, { row: db, at: Date.now() });
      return db;
    }
    const fallback = fromStatic(benchmark);
    memory.set(benchmark, { row: fallback, at: Date.now() });
    return fallback;
  })().finally(() => inflight.delete(benchmark));
  inflight.set(benchmark, job);
  return job;
}

/** Live NSE constituent list + cap-weight proxy (DB-backed, cron-refreshed). Never blocks on network refresh. */
export async function getBenchmarkWeightsSnapshot(benchmark: BenchmarkId): Promise<BenchmarkWeightsRow> {
  const cached = memory.get(benchmark);
  if (cached && Date.now() - cached.at < MEMORY_TTL_MS) return cached.row;

  const db = await loadBenchmarkWeights(benchmark);
  if (db?.weights && Object.keys(db.weights).length) {
    memory.set(benchmark, { row: db, at: Date.now() });
    if (!isFresh(db, STALE_MS)) void refreshOne(benchmark);
    return db;
  }

  const fallback = fromStatic(benchmark);
  memory.set(benchmark, { row: fallback, at: Date.now() });
  void refreshOne(benchmark);
  return fallback;
}

export async function getBenchmarkStockWeights(benchmark: BenchmarkId): Promise<Record<string, number>> {
  const snap = await getBenchmarkWeightsSnapshot(benchmark);
  return snap.weights;
}

export async function getBenchmarkSnapshotDate(benchmark: BenchmarkId): Promise<string> {
  const snap = await getBenchmarkWeightsSnapshot(benchmark);
  return snap.asOf;
}
