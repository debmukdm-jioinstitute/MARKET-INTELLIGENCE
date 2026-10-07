/**
 * Pure state model for the Price Bento (hero + chart + range + previous close + takeaway).
 * No React, no fetching — everything here is unit-tested.
 *
 * INVARIANTS (see README "Chart colour & change invariants" and "Price bento"):
 *  - Daily hero colour/words come from the UNROUNDED (close − previousClose), never the % string.
 *  - Signed zero is normalised to 0 → "flat".
 *  - Missing / non-finite inputs are never coerced to 0 — they yield `null` states.
 *  - Index quotes are in "points"; Indian equities in ₹; US equities in $.
 */

export type BentoUnit = "index" | "inr" | "usd";
export type BentoDirection = "up" | "down" | "flat";
export type BentoTf = "1D" | "1W" | "1M" | "1Y";
export const BENTO_TFS: readonly BentoTf[] = ["1D", "1W", "1M", "1Y"];

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

export type DailyMove = {
  direction: BentoDirection;
  change: number;
  /** Percent (not fraction): −0.14 means −0.14%. */
  changePct: number | null;
};

export function dailyMove(close: number | null | undefined, prevClose: number | null | undefined): DailyMove | null {
  if (!isNum(close) || !isNum(prevClose)) return null;
  const raw = close - prevClose;
  // Normalise signed zero and float dust (e.g. 1e-12) to exactly 0.
  const change = Math.abs(raw) < 1e-9 ? 0 : raw;
  const changePct = prevClose !== 0 ? (change / prevClose) * 100 : null;
  return { direction: change > 0 ? "up" : change < 0 ? "down" : "flat", change, changePct };
}

/** Where the close sits within [low, high], 0..1. Equal/invalid bounds → centre. Null if no close. */
export function rangeMarker(close: number | null | undefined, low: number | null | undefined, high: number | null | undefined): number | null {
  if (!isNum(close)) return null;
  if (!isNum(low) || !isNum(high) || high <= low) return 0.5;
  return Math.min(1, Math.max(0, (close - low) / (high - low)));
}

export function heroWords(session: "open" | "closed", dir: BentoDirection): [string, string] {
  const lead = session === "open" ? "Trading" : "Closed";
  return [lead, dir === "up" ? "higher." : dir === "down" ? "lower." : "unchanged."];
}

const TF_HEADING: Record<BentoTf, string> = {
  "1D": "The day, in one line.",
  "1W": "The week, in one line.",
  "1M": "The month, in one line.",
  "1Y": "The year, in one line.",
};
export const chartHeading = (tf: BentoTf) => TF_HEADING[tf];

const TF_LONG: Record<BentoTf, string> = { "1D": "today", "1W": "past week", "1M": "past month", "1Y": "past year" };
export const tfLong = (tf: BentoTf) => TF_LONG[tf];

const MINUS = "−";

function groupedNumber(abs: number, unit: BentoUnit, maxDigits = 2): string {
  const locale = unit === "usd" ? "en-US" : "en-IN";
  return abs.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: maxDigits });
}

/** Absolute value with unit symbol: "13,131.05" (index), "₹1,234.50", "$187.20". */
export function fmtValue(v: number | null | undefined, unit: BentoUnit): string {
  if (!isNum(v)) return "—";
  const s = groupedNumber(Math.abs(v), unit);
  const sign = v < 0 ? MINUS : "";
  return unit === "inr" ? `${sign}₹${s}` : unit === "usd" ? `${sign}$${s}` : `${sign}${s}`;
}

/** Signed absolute change: "−18.41 points", "−₹18.41", "+$1.20", "0.00 points". */
export function fmtChange(v: number | null | undefined, unit: BentoUnit): string {
  if (!isNum(v)) return "—";
  const abs = Math.abs(v);
  const s = groupedNumber(abs, unit);
  const sign = v < 0 ? MINUS : v > 0 ? "+" : "";
  if (unit === "inr") return `${sign}₹${s}`;
  if (unit === "usd") return `${sign}$${s}`;
  return `${sign}${s} points`;
}

/** Signed percent from a percent number: "−0.14%", "+0.52%", "0.00%". Rounds to 2dp but sign comes from the caller's direction. */
export function fmtPctNum(p: number | null | undefined, dir?: BentoDirection): string {
  if (!isNum(p)) return "—";
  const abs = Math.abs(p).toFixed(2);
  const d = dir ?? (p > 0 ? "up" : p < 0 ? "down" : "flat");
  // A tiny real move that rounds to 0.00 keeps its true direction sign so colour/icon/text agree.
  if (d === "flat") return "0.00%";
  return `${d === "down" ? MINUS : "+"}${abs}%`;
}

/** "Down 0.14% from the previous close." — factual only. */
export function takeaway(move: DailyMove | null): string {
  if (!move) return "Not enough data to compare with the previous close.";
  if (move.direction === "flat") return "Unchanged from the previous close.";
  const pct = move.changePct == null ? null : Math.abs(move.changePct).toFixed(2);
  const word = move.direction === "up" ? "Up" : "Down";
  return pct == null ? `${word} from the previous close.` : `${word} ${pct}% from the previous close.`;
}

export type SeriesPoint = { t: number; v: number };

/** Direction of a chart series over its own range (first → last). */
export function rangeDirection(series: readonly SeriesPoint[]): BentoDirection {
  if (series.length < 2) return "flat";
  const d = series[series.length - 1].v - series[0].v;
  return Math.abs(d) < 1e-9 ? "flat" : d > 0 ? "up" : "down";
}

/** Plot domain, always including `baseline` (previous close) when given, with 8% padding. */
export function plotDomain(series: readonly SeriesPoint[], baseline?: number | null): { min: number; max: number } | null {
  if (!series.length) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const p of series) {
    if (p.v < min) min = p.v;
    if (p.v > max) max = p.v;
  }
  if (isNum(baseline)) {
    min = Math.min(min, baseline);
    max = Math.max(max, baseline);
  }
  const span = max - min || Math.abs(max) * 0.002 || 1;
  return { min: min - span * 0.08, max: max + span * 0.08 };
}

/** Nearest series index to a 0..1 horizontal fraction (series are evenly spaced by index). */
export function nearestIndex(len: number, frac: number): number {
  if (len <= 1) return 0;
  return Math.min(len - 1, Math.max(0, Math.round(frac * (len - 1))));
}

/** Format a timestamp in a market timezone. */
export function fmtStamp(ms: number, tz: "Asia/Kolkata" | "America/New_York", tf: BentoTf): string {
  const d = new Date(ms);
  if (tf === "1D") return d.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
  return d.toLocaleDateString("en-GB", { timeZone: tz, day: "numeric", month: "short", year: tf === "1Y" ? "2-digit" : undefined });
}

/** "Closed 15:30 IST · 7 Oct 2026" / "Updated 11:42 IST · 7 Oct 2026". */
export function fmtSessionLine(asOf: string | number | null | undefined, session: "open" | "closed", tz: "Asia/Kolkata" | "America/New_York"): string | null {
  if (asOf == null) return null;
  const ms = typeof asOf === "number" ? asOf : Date.parse(asOf);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  const time = d.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
  const date = d.toLocaleDateString("en-GB", { timeZone: tz, day: "numeric", month: "short", year: "numeric" });
  const zone = tz === "Asia/Kolkata" ? "IST" : "ET";
  return `${session === "open" ? "Updated" : "Market closed · as of"} ${time} ${zone} · ${date}`;
}

/** US regular session (Mon–Fri 09:30–16:00 ET) AND data fresh (<20 min). No holiday calendar for US exists in-repo. */
export function usSessionOpen(asOfMs: number | null, nowMs: number = Date.now()): boolean {
  if (asOfMs == null || nowMs - asOfMs > 20 * 60_000) return false;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(nowMs));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = get("weekday");
  if (wd === "Sat" || wd === "Sun") return false;
  const mins = (Number(get("hour")) % 24) * 60 + Number(get("minute"));
  return mins >= 9 * 60 + 30 && mins < 16 * 60;
}

/**
 * Best available previous close. Priority: explicit prevClose → price − change (when change is non-zero)
 * → price / (1 + changePct) (some Yahoo fallbacks report change = 0 with a real changePct)
 * → price − change. `changePct` is a FRACTION (−0.0122 = −1.22%).
 */
export function derivePrevClose(q: { price: number; prevClose?: number | null; change?: number | null; changePct?: number | null }): number | null {
  if (!isNum(q.price)) return null;
  if (isNum(q.prevClose) && q.prevClose > 0) return q.prevClose;
  if (isNum(q.change) && q.change !== 0) return q.price - q.change;
  if (isNum(q.changePct) && q.changePct !== 0 && q.changePct > -1) return q.price / (1 + q.changePct);
  return isNum(q.change) ? q.price - q.change : null;
}
