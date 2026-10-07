import { formatPct } from "@/lib/format";

export function fmtNum(n: number | null | undefined, digits = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function fmtInr(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function fmtUsd(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function fmtChgPct(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return formatPct(n);
}

export function fmtCr(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`;
}

/** Signed point/absolute change with true minus sign, e.g. "−71.95" / "+120.40". Always pair with the % badge. */
export function fmtChgPts(n: number | null | undefined, digits = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  const s = Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
  return n < 0 ? `−${s}` : `${n > 0 ? "+" : ""}${s}`;
}

/**
 * "−71.95 (−0.13%)" — points AND percent together. `pct` is a FRACTION (0.0013 = 0.13%).
 * Falls back to percent only when the absolute change is unavailable. See README invariants.
 */
export function fmtMove(change: number | null | undefined, pct: number | null | undefined, digits = 2) {
  if (pct == null || Number.isNaN(pct)) return change == null || Number.isNaN(change) ? "—" : fmtChgPts(change, digits);
  if (change == null || Number.isNaN(change)) return formatPct(pct);
  return `${fmtChgPts(change, digits)} (${formatPct(pct)})`;
}
