import { cleanRecordBatch } from "./records";
import type { Obs, SeriesResult } from "./types";

/**
 * Shared ingest contract for external collectors (Phase 3: GitHub Actions
 * runners pushing into the site instead of paid Apify actors).
 *
 * POST /api/collector/ingest accepts:
 *   { series?: SeriesResult[], ok?: string[], failures?: { id, error }[] }
 *
 * Honesty rules enforced here, before anything touches the DB:
 * - A series with zero usable observations is REJECTED (never saved) so a
 *   broken scrape can never overwrite last-good data or mark a series fresh.
 * - Observations with malformed dates or non-finite values are dropped; a
 *   series left with none is rejected.
 * - Failures are recorded separately via markFailure(`collector:<id>`)
 *   (Phase 5 health monitor reads them from /api/collector).
 */

export type IngestFailure = { id: string; error: string };

export type ValidatedIngest = {
  series: SeriesResult[];
  ok: string[];
  failures: IngestFailure[];
  rejected: { id: string; reason: string }[];
};

const CATEGORIES = new Set(["market", "macro", "rates", "valuation", "positioning", "funds"]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function cleanString(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

function validDate(d: unknown): string | null {
  if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const t = Date.parse(`${d}T00:00:00Z`);
  return Number.isNaN(t) ? null : d;
}

function cleanObs(raw: unknown): Obs[] {
  if (!Array.isArray(raw)) return [];
  const out: Obs[] = [];
  for (const o of raw) {
    if (!isRecord(o)) continue;
    const date = validDate(o.date);
    const value = typeof o.value === "number" && Number.isFinite(o.value) ? o.value : null;
    if (!date || value === null) continue;
    const meta = isRecord(o.meta) ? (o.meta as Record<string, unknown>) : undefined;
    out.push(meta ? { date, value, meta } : { date, value });
  }
  // De-duplicate by date, keep the last occurrence (freshest in the payload).
  const byDate = new Map<string, Obs>();
  for (const o of out) byDate.set(o.date, o);
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Validate one series; returns null when the series must be rejected. */
function cleanSeries(raw: unknown): { series?: SeriesResult; reject?: string } {
  if (!isRecord(raw)) return { reject: "not an object" };
  const id = cleanString(raw.id);
  if (!id) return { reject: "missing id" };
  const label = cleanString(raw.label) ?? id;
  const unit = cleanString(raw.unit) ?? "";
  const category = cleanString(raw.category);
  if (!category || !CATEGORIES.has(category)) return { reject: `bad category: ${String(raw.category)}` };
  const provider = cleanString(raw.provider) ?? "external";
  const url = cleanString(raw.url) ?? "";
  const obs = cleanObs(raw.obs);
  if (!obs.length) return { reject: "no usable observations — last-good preserved" };
  const records = cleanRecordBatch(raw.records) ?? undefined;
  return {
    series: {
      id,
      label,
      unit,
      category: category as SeriesResult["category"],
      provider,
      url,
      obs,
      ...(records ? { records } : {}),
    },
  };
}

/** Validate a raw ingest body into clean parts. Never throws. */
export function validateIngestBody(body: unknown): ValidatedIngest {
  const out: ValidatedIngest = { series: [], ok: [], failures: [], rejected: [] };
  if (!isRecord(body)) return out;

  if (Array.isArray(body.series)) {
    for (const raw of body.series) {
      const { series, reject } = cleanSeries(raw);
      if (series) out.series.push(series);
      else out.rejected.push({ id: cleanString(isRecord(raw) ? raw.id : null) ?? "(unknown)", reason: reject ?? "invalid" });
    }
  }
  if (Array.isArray(body.ok)) {
    for (const id of body.ok) {
      const s = cleanString(id);
      if (s && !out.ok.includes(s)) out.ok.push(s);
    }
  }
  if (Array.isArray(body.failures)) {
    for (const f of body.failures) {
      if (!isRecord(f)) continue;
      const id = cleanString(f.id);
      const error = cleanString(f.error)?.slice(0, 300);
      if (id && error) out.failures.push({ id, error });
    }
  }
  return out;
}

export type CollectorRun =
  | { collector: string; results: SeriesResult[] }
  | { collector: string; error: string };

/**
 * Shape per-collector outcomes into an ingest payload. Pure — used by the
 * GitHub Actions runner script and unit-tested here.
 * A collector that threw contributes a failure; one that returned without
 * throwing counts as ok (mirrors runCollectors). Series with no usable
 * observations are rejected by validation at ingest time and reported.
 */
export function shapeIngestPayload(runs: CollectorRun[]): {
  series: SeriesResult[];
  ok: string[];
  failures: IngestFailure[];
} {
  const series: SeriesResult[] = [];
  const ok: string[] = [];
  const failures: IngestFailure[] = [];
  for (const r of runs) {
    if ("error" in r) {
      failures.push({ id: r.collector, error: r.error.slice(0, 300) });
      continue;
    }
    series.push(...r.results);
    ok.push(r.collector);
  }
  return { series, ok, failures };
}
