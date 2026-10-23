export type Row = { date: string; [k: string]: number | null | string };
export type Tf = { type: "rebase" | "change" | "drawdown" | "rolling" | "cumsum"; base?: number; window?: number };

/** Pure client-side transforms. Null inputs stay null; they never reset running state. */
export function applyTf(rows: Row[], cols: string[], tf?: Tf): Row[] {
  if (!tf) return rows;
  const out = rows.map((r) => ({ ...r }));
  for (const c of cols) {
    let first: number | null = null;
    let peak = -Infinity;
    let sum = 0;
    out.forEach((r, i) => {
      const v = rows[i][c] as number | null;
      if (v == null) { r[c] = null; return; }
      if (tf.type === "rebase") {
        first ??= v;
        r[c] = first ? (v / first) * (tf.base ?? 100) : null;
      } else if (tf.type === "cumsum") {
        sum += v;
        r[c] = sum;
      } else if (tf.type === "drawdown") {
        peak = Math.max(peak, v);
        r[c] = peak ? (v / peak - 1) * 100 : null;
      } else {
        const w = tf.type === "change" ? (tf.window ?? 1) : (tf.window ?? 252);
        const p = i - w >= 0 ? (rows[i - w][c] as number | null) : null;
        r[c] = p ? (v / p - 1) * 100 : null;
      }
    });
  }
  return out;
}

export const sliceRange = (rows: Row[], from?: string, to?: string): Row[] =>
  rows.filter((r) => (!from || r.date >= from) && (!to || r.date <= to));

/** Max `limit` points per series: keep every k-th row, always the last. */
export function downsample<T>(rows: T[], limit = 1500): T[] {
  if (rows.length <= limit) return rows;
  const k = Math.ceil(rows.length / limit);
  const out = rows.filter((_, i) => i % k === 0);
  if (out[out.length - 1] !== rows[rows.length - 1]) out.push(rows[rows.length - 1]);
  return out;
}

/** Percentile of a sorted array (linear interpolation). */
export function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return NaN;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export type Stats = { bandLo: number; bandHi: number; recHi: { date: string; v: number }; recLo: { date: string; v: number }; latest: { date: string; v: number }; position: "inside" | "above" | "below" };

/** Usual band = p10..p90 of full history (monthly-resampled: last obs per month). Records = all-time max/min. */
export function indicatorStats(pts: { date: string; v: number }[]): Stats | null {
  if (!pts.length) return null;
  const monthly = new Map<string, number>();
  for (const p of pts) monthly.set(p.date.slice(0, 7), p.v);
  const sorted = [...monthly.values()].sort((a, b) => a - b);
  const bandLo = percentile(sorted, 0.1), bandHi = percentile(sorted, 0.9);
  const recHi = pts.reduce((a, b) => (b.v > a.v ? b : a));
  const recLo = pts.reduce((a, b) => (b.v < a.v ? b : a));
  const last = pts[pts.length - 1];
  return { bandLo, bandHi, recHi, recLo, latest: last, position: last.v > bandHi ? "above" : last.v < bandLo ? "below" : "inside" };
}
