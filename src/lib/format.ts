const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdPrecise = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

export function formatUsd(value: number, precise = false) {
  return (precise ? usdPrecise : usd).format(value);
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatInr(value: number) {
  return inr.format(value);
}

export function formatCompactInr(value: number) {
  if (Math.abs(value) >= 1_000_000) return `₹${compact.format(value)}`;
  return formatInr(value);
}

export function formatCompactUsd(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$${compact.format(value)}`;
  return formatUsd(value);
}

export function formatPct(value: number, digits = 2, signed = true) {
  const pct = (value * 100).toFixed(digits);
  // One negative convention app-wide: true minus sign, never a hyphen.
  if (pct.startsWith("-")) return `\u2212${pct.slice(1)}%`;
  return `${signed && value > 0 ? "+" : ""}${pct}%`;
}

export function formatNumber(value: number, digits = 2) {
  return value.toFixed(digits);
}

export function formatSigned(value: number, digits = 2) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

export function toneFromSigned(value: number): "up" | "down" | "neutral" {
  if (value > 0.0000001) return "up";
  if (value < -0.0000001) return "down";
  return "neutral";
}

type DateInput = Date | string | number;

/** Site-wide date format: DD-MM-YYYY (+ " HH:mm" when `time`). Default zone IST; pass "UTC" for date-only ISO strings. */
export function formatDate(value: DateInput, opts: { time?: boolean; tz?: string } = {}): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const timeZone = opts.tz ?? "Asia/Kolkata";
  const date = d.toLocaleDateString("en-GB", { timeZone, day: "2-digit", month: "2-digit", year: "numeric" }).replaceAll("/", "-");
  if (!opts.time) return date;
  return `${date} ${d.toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

/** Rewrites every YYYY-MM-DD in a string as DD-MM-YYYY (for ISO dates straight from the API). */
export function isoToDmy(s: string | null | undefined): string {
  return (s ?? "").replace(/(\d{4})-(\d{2})-(\d{2})/g, "$3-$2-$1");
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const mm = (name: string) => String(MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1).padStart(2, "0");

/** Rewrites "2 Jan 2008" as 02-01-2008 and "Mar 2020" as 01-03-2020 inside any text (month-only means the 1st). */
export function dmy(s: string): string {
  return s
    .replace(/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (\d{4})\b/g, (_, d: string, m: string, y: string) => `${d.padStart(2, "0")}-${mm(m)}-${y}`)
    .replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (\d{4})\b/g, (_, m: string, y: string) => `01-${mm(m)}-${y}`);
}
