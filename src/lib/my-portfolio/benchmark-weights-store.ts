import { hasDatabase, sql } from "@/lib/db";
import type { BenchmarkId } from "@/lib/my-portfolio/benchmark-options";

/** cap_yahoo: NSE/BSE constituents weighted by live market cap. unavailable: no live source answered. */
export type BenchmarkWeightMethod = "cap_yahoo" | "unavailable";

export type BenchmarkWeightsRow = {
  benchmark: BenchmarkId;
  weights: Record<string, number>;
  asOf: string;
  sourceUrl: string;
  method: BenchmarkWeightMethod;
  fetchedAt: string;
};

let schemaReady: Promise<void> | null = null;

function ensureBenchmarkWeightsSchema(): Promise<void> {
  if (!hasDatabase()) return Promise.resolve();
  schemaReady ??= (async () => {
    await sql()`
      CREATE TABLE IF NOT EXISTS benchmark_index_weights (
        benchmark text PRIMARY KEY,
        weights jsonb NOT NULL,
        as_of date NOT NULL,
        source_url text NOT NULL,
        method text NOT NULL,
        fetched_at timestamptz NOT NULL DEFAULT now()
      )
    `;
  })().catch((e) => {
    schemaReady = null;
    throw e;
  });
  return schemaReady;
}

export async function loadBenchmarkWeights(benchmark: BenchmarkId): Promise<BenchmarkWeightsRow | null> {
  if (!hasDatabase()) return null;
  try {
    await ensureBenchmarkWeightsSchema();
    const rows = (await sql()`
      SELECT benchmark, weights, as_of, source_url, method, fetched_at
      FROM benchmark_index_weights WHERE benchmark = ${benchmark}
    `) as {
      benchmark: string;
      weights: Record<string, number>;
      as_of: Date | string;
      source_url: string;
      method: BenchmarkWeightMethod;
      fetched_at: Date | string;
    }[];
    const row = rows[0];
    if (!row?.weights || typeof row.weights !== "object") return null;
    // Rows from the removed static / equal-weight fallbacks are not real index weights.
    if (row.method !== "cap_yahoo") return null;
    return {
      benchmark: row.benchmark as BenchmarkId,
      weights: row.weights,
      asOf: (row.as_of instanceof Date ? row.as_of.toISOString() : String(row.as_of)).slice(0, 10),
      sourceUrl: row.source_url,
      method: row.method,
      fetchedAt: (row.fetched_at instanceof Date ? row.fetched_at.toISOString() : String(row.fetched_at)),
    };
  } catch {
    return null;
  }
}

export async function saveBenchmarkWeights(row: BenchmarkWeightsRow): Promise<void> {
  if (!hasDatabase()) return;
  await ensureBenchmarkWeightsSchema();
  await sql()`
    INSERT INTO benchmark_index_weights (benchmark, weights, as_of, source_url, method, fetched_at)
    VALUES (
      ${row.benchmark},
      ${JSON.stringify(row.weights)}::jsonb,
      ${row.asOf}::date,
      ${row.sourceUrl},
      ${row.method},
      now()
    )
    ON CONFLICT (benchmark) DO UPDATE SET
      weights = EXCLUDED.weights,
      as_of = EXCLUDED.as_of,
      source_url = EXCLUDED.source_url,
      method = EXCLUDED.method,
      fetched_at = now()
  `;
}
