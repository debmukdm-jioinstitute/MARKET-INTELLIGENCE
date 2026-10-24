import { formatDate } from "@/lib/format";

function parseDay(iso: string): Date | null {
  const trimmed = iso.trim();
  if (!trimmed) return null;
  const ms = Date.parse(trimmed);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

function fmtDay(d: Date): string {
  return formatDate(d);
}

/** e.g. `25-09-2026 – 29-09-2026`. */
export function formatIpoBidWindow(startIso: string, endIso: string): string {
  const start = parseDay(startIso);
  const end = parseDay(endIso);
  if (!start && !end) return `${startIso} → ${endIso}`;
  if (!start) return end ? fmtDay(end) : endIso;
  if (!end) return fmtDay(start);

  return `${fmtDay(start)} – ${fmtDay(end)}`;
}
