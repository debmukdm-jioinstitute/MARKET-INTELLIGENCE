import type { FieldSource, QuoteField } from "@/lib/feeds/india/types";

export function formatIstTimestamp(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function sourceLabel(source?: FieldSource | null): string {
  if (!source?.provider || source.provider === "Unavailable") return "";
  return source.provider;
}

export function formatInr(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "";
  return value.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function formatPct(changePct: number | null | undefined): string {
  if (changePct == null || !Number.isFinite(changePct)) return "";
  const pct = changePct * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export type LiveFigure = {
  display: string;
  changeDisplay: string;
  source: string;
  fetched: string;
  unavailable: boolean;
};

export function liveFromQuote(q: QuoteField | undefined, fetchedAt: string, opts?: { suffix?: string; digits?: number }): LiveFigure {
  const source = sourceLabel(q?.source);
  const fetched = formatIstTimestamp(q?.source?.asOf ?? fetchedAt);
  if (q?.value == null || !source) {
    return { display: "", changeDisplay: "", source: "", fetched, unavailable: true };
  }
  const display = `${formatInr(q.value, opts?.digits ?? 2)}${opts?.suffix ?? ""}`;
  const changeDisplay = formatPct(q.changePct);
  return { display, changeDisplay, source, fetched, unavailable: false };
}

export function fiiDiiStance(fii: number | null, dii: number | null): string {
  if (fii == null && dii == null) return "";
  if (fii != null && dii != null) {
    if (fii > 0 && dii > 0) return "Net buy (both)";
    if (fii < 0 && dii < 0) return "Net sell (both)";
    return "Mixed";
  }
  if (fii != null) return fii >= 0 ? "FII net buy" : "FII net sell";
  return dii! >= 0 ? "DII net buy" : "DII net sell";
}

export function vixRegime(vix: number | null): string {
  if (vix == null) return "";
  if (vix < 14) return "Calm";
  if (vix < 18) return "Elevated";
  return "Hot";
}
