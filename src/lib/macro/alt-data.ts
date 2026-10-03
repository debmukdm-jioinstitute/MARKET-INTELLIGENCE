import { hasDatabase, sql } from "@/lib/db";
import { ensureCollectorSchema } from "@/lib/collector/store";

/**
 * Read helpers for the rates / macro / India alt-data panels. Everything here reads what the
 * collectors stored in `collected_series` / `collected_obs`; nothing is estimated or back-filled.
 * Missing data → empty arrays / null, which the UI renders as an honest empty state.
 */

export type AltPoint = { date: string; value: number };
export type AltSeries = {
  id: string;
  label: string;
  unit: string;
  provider: string;
  url: string;
  lastOk: string | null;
  points: AltPoint[];
};

const day = (d: Date | string) => (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10);

/** Load whole series by exact id and/or id prefix, limited to the last `sinceDays` days of observations. */
export async function loadAltSeries(opts: { ids?: string[]; prefixes?: string[]; sinceDays: number }): Promise<AltSeries[]> {
  if (!hasDatabase()) return [];
  const ids = opts.ids ?? [];
  const prefixes = opts.prefixes ?? [];
  if (!ids.length && !prefixes.length) return [];
  try {
    await ensureCollectorSchema();
    const rows = (await sql()`
      SELECT s.id, s.label, s.unit, s.provider, s.url, s.last_ok, o.obs_date, o.value
      FROM collected_series s
      JOIN collected_obs o ON o.series_id = s.id
      WHERE (s.id = ANY(${ids}::text[]) OR EXISTS (SELECT 1 FROM unnest(${prefixes}::text[]) p WHERE starts_with(s.id, p)))
        AND o.obs_date >= (current_date - ${opts.sinceDays}::int)
      ORDER BY s.id, o.obs_date
    `) as { id: string; label: string; unit: string; provider: string; url: string; last_ok: Date | string | null; obs_date: Date | string; value: number }[];
    const out = new Map<string, AltSeries>();
    for (const r of rows) {
      let s = out.get(r.id);
      if (!s) {
        s = { id: r.id, label: r.label, unit: r.unit, provider: r.provider, url: r.url, lastOk: r.last_ok ? new Date(r.last_ok).toISOString() : null, points: [] };
        out.set(r.id, s);
      }
      s.points.push({ date: day(r.obs_date), value: Number(r.value) });
    }
    return [...out.values()];
  } catch {
    return [];
  }
}

/** Why a collector has no data: its last recorded failure message, if any. */
export async function collectorFailure(collectorId: string): Promise<string | null> {
  if (!hasDatabase()) return null;
  try {
    await ensureCollectorSchema();
    const rows = (await sql()`SELECT last_error FROM collected_series WHERE id = ${`collector:${collectorId}`}`) as { last_error: string | null }[];
    return rows[0]?.last_error ?? null;
  } catch {
    return null;
  }
}

export const latestOf = (s: AltSeries | undefined): AltPoint | null => (s && s.points.length ? s.points[s.points.length - 1]! : null);

const shiftYear = (iso: string, years: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d;
};

/**
 * Year-on-year % change of the point at `date`, from the stored point one year earlier.
 * `toleranceDays` allows for daily series (weekends/holidays); monthly series use 0.
 * Returns null when there is no real year-ago observation — never interpolated.
 */
export function yoyPct(points: AltPoint[], date: string, toleranceDays = 0): number | null {
  const cur = points.find((p) => p.date === date);
  if (!cur) return null;
  const target = shiftYear(date, -1).getTime();
  let best: AltPoint | null = null;
  let bestDelta = Infinity;
  for (const p of points) {
    const delta = Math.abs(new Date(`${p.date}T00:00:00Z`).getTime() - target) / 86_400_000;
    if (delta <= toleranceDays && delta < bestDelta) {
      best = p;
      bestDelta = delta;
    }
  }
  if (!best || best.value === 0) return null;
  return ((cur.value - best.value) / Math.abs(best.value)) * 100;
}

/** Tenor slug → days, for ordering curves ("on" < "7d" < "1m" < "1y"). */
export function tenorRank(slug: string): number {
  if (slug === "on") return 0;
  const m = /^(\d+(?:\.\d+)?)([dmy])$/.exec(slug);
  if (!m) return 99_999;
  const n = Number(m[1]);
  return m[2] === "d" ? n : m[2] === "m" ? n * 30 : n * 365;
}

export type CurvePoint = { tenor: string; rank: number; date: string; value: number; prev: number | null; url: string };

/** Latest value per series sharing `prefix`, ordered short → long tenor. */
export function curveOf(series: AltSeries[], prefix: string): CurvePoint[] {
  return series
    .filter((s) => s.id.startsWith(prefix) && s.points.length)
    .map((s) => {
      const tenor = s.id.slice(prefix.length);
      const last = s.points[s.points.length - 1]!;
      const prev = s.points.length > 1 ? s.points[s.points.length - 2]!.value : null;
      return { tenor, rank: tenorRank(tenor), date: last.date, value: last.value, prev, url: s.url };
    })
    .sort((a, b) => a.rank - b.rank);
}

export function lastDays(points: AltPoint[], days: number): AltPoint[] {
  if (!points.length) return [];
  const end = new Date(`${points[points.length - 1]!.date}T00:00:00Z`).getTime();
  return points.filter((p) => end - new Date(`${p.date}T00:00:00Z`).getTime() <= days * 86_400_000);
}

export const CACHE = {
  sixHours: "public, s-maxage=21600, stale-while-revalidate=43200",
  day: "public, s-maxage=86400, stale-while-revalidate=86400",
  week: "public, s-maxage=604800, stale-while-revalidate=86400",
} as const;
