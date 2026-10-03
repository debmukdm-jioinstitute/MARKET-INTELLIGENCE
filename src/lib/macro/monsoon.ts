import type { AltPoint } from "./alt-data";

/**
 * "% of normal" for the monsoon proxy, computed ONLY from stored observations:
 *  - actual   = mean across the tracked points of the rain total over a window;
 *  - normal   = mean of the SAME window in earlier years we hold (5-year backfill), requiring at least
 *               3 complete earlier years — otherwise normal/pct are null (never guessed);
 *  - a window counts only if every tracked point has ≥ 90% of its days stored.
 * The data are weather-model precipitation (Open-Meteo), so "normal" is the recent 3–5 year average of that
 * same source, not IMD's long-period average. The UI says so.
 */

const DAY = 86_400_000;
const ms = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => iso(ms(d) + n * DAY);
const shiftYears = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCFullYear(x.getUTCFullYear() + n);
  return x.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string) => Math.round((ms(b) - ms(a)) / DAY) + 1;

export type Window = {
  start: string;
  end: string;
  actualMm: number | null;
  normalMm: number | null;
  pctOfNormal: number | null;
  yearsInNormal: number;
};

export type MonsoonResult = {
  mode: "season" | "last90" | "none";
  today: string;
  /** Primary window for `mode` (season-to-date in Jun–Sep, otherwise the last 90 days). */
  window: Window | null;
  /** The most recent Jun 1 – Sep 30 season (or its season-to-date), for the off-season recap. */
  season: Window | null;
  seasonYear: number;
  verdict: "ahead" | "behind" | "about-normal" | null;
  daily: AltPoint[];
  cumulative: { date: string; actual: number; normal: number | null }[];
  locations: number;
};

type ByDay = Map<string, number>;

function sumWindow(m: ByDay, start: string, end: string): number | null {
  const need = daysBetween(start, end);
  if (need <= 0) return null;
  let sum = 0;
  let have = 0;
  for (let t = ms(start); t <= ms(end); t += DAY) {
    const v = m.get(iso(t));
    if (v !== undefined) {
      sum += v;
      have++;
    }
  }
  return have >= Math.ceil(need * 0.9) ? sum : null;
}

/** Mean over locations of the window sum; null unless EVERY location is adequately covered. */
function proxyWindow(locs: ByDay[], start: string, end: string): number | null {
  const sums = locs.map((m) => sumWindow(m, start, end));
  if (!sums.length || sums.some((s) => s === null)) return null;
  return (sums as number[]).reduce((a, b) => a + b, 0) / sums.length;
}

function windowStats(locs: ByDay[], start: string, end: string): Window {
  const actual = proxyWindow(locs, start, end);
  const priors: number[] = [];
  for (let k = 1; k <= 5; k++) {
    const v = proxyWindow(locs, shiftYears(start, -k), shiftYears(end, -k));
    if (v !== null) priors.push(v);
  }
  const normal = priors.length >= 3 ? priors.reduce((a, b) => a + b, 0) / priors.length : null;
  return {
    start,
    end,
    actualMm: actual,
    normalMm: normal,
    pctOfNormal: actual !== null && normal !== null && normal > 0 ? (actual / normal) * 100 : null,
    yearsInNormal: priors.length,
  };
}

export function computeMonsoon(byLocation: Record<string, AltPoint[]>, today: string): MonsoonResult {
  const locs: ByDay[] = Object.values(byLocation)
    .filter((pts) => pts.length)
    .map((pts) => new Map(pts.map((p) => [p.date, p.value])));
  const empty: MonsoonResult = { mode: "none", today, window: null, season: null, seasonYear: Number(today.slice(0, 4)), verdict: null, daily: [], cumulative: [], locations: locs.length };
  if (!locs.length) return empty;

  const yesterday = addDays(today, -1);
  const month = Number(today.slice(5, 7));
  const inSeason = month >= 6 && month <= 9;
  const seasonYear = month >= 6 ? Number(today.slice(0, 4)) : Number(today.slice(0, 4)) - 1;
  const seasonStart = `${seasonYear}-06-01`;
  const seasonEnd = yesterday < `${seasonYear}-09-30` ? yesterday : `${seasonYear}-09-30`;
  const season = seasonEnd >= seasonStart ? windowStats(locs, seasonStart, seasonEnd) : null;
  const last90 = windowStats(locs, addDays(yesterday, -89), yesterday);
  const window = inSeason ? season : last90;

  // Daily all-India proxy (mean across locations present that day) — last 92 days.
  const daily: AltPoint[] = [];
  for (let t = ms(yesterday) - 91 * DAY; t <= ms(yesterday); t += DAY) {
    const d = iso(t);
    const vals = locs.map((m) => m.get(d)).filter((v): v is number => v !== undefined);
    if (vals.length >= Math.ceil(locs.length / 2)) daily.push({ date: d, value: vals.reduce((a, b) => a + b, 0) / vals.length });
  }

  // Cumulative season curve vs the same curve averaged over earlier complete years.
  const cumulative: MonsoonResult["cumulative"] = [];
  if (season && season.actualMm !== null) {
    // Earlier years whose whole same-length window is adequately covered.
    const okYears: number[] = [];
    for (let k = 1; k <= 5; k++) if (proxyWindow(locs, shiftYears(seasonStart, -k), shiftYears(seasonEnd, -k)) !== null) okYears.push(k);
    const meanOn = (d: string) => locs.reduce((s, m) => s + (m.get(d) ?? 0), 0) / locs.length;
    let actual = 0;
    const priorCum = okYears.map(() => 0);
    for (let t = ms(seasonStart); t <= ms(seasonEnd); t += DAY) {
      const d = iso(t);
      actual += meanOn(d);
      okYears.forEach((k, i) => {
        priorCum[i] = (priorCum[i] ?? 0) + meanOn(shiftYears(d, -k));
      });
      const normal = okYears.length >= 3 ? priorCum.reduce((x, y) => x + y, 0) / okYears.length : null;
      cumulative.push({ date: d, actual: Math.round(actual * 10) / 10, normal: normal === null ? null : Math.round(normal * 10) / 10 });
    }
  }

  const pct = window?.pctOfNormal ?? null;
  const verdict = pct === null ? null : pct >= 105 ? "ahead" : pct <= 95 ? "behind" : "about-normal";
  return { mode: inSeason ? "season" : "last90", today, window, season, seasonYear, verdict, daily, cumulative, locations: locs.length };
}
