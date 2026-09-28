const IST = "Asia/Kolkata";

function parseDay(iso: string): Date | null {
  const trimmed = iso.trim();
  if (!trimmed) return null;
  const ms = Date.parse(trimmed);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

function fmtDay(d: Date): string {
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: IST });
}

/** e.g. `25–29 Sep 2026` when same month; otherwise full range. */
export function formatIpoBidWindow(startIso: string, endIso: string): string {
  const start = parseDay(startIso);
  const end = parseDay(endIso);
  if (!start && !end) return `${startIso} → ${endIso}`;
  if (!start) return end ? fmtDay(end) : endIso;
  if (!end) return fmtDay(start);

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    const monthYear = start.toLocaleString("en-IN", { month: "short", year: "numeric", timeZone: IST });
    const d1 = start.toLocaleString("en-IN", { day: "numeric", timeZone: IST });
    const d2 = end.toLocaleString("en-IN", { day: "numeric", timeZone: IST });
    return `${d1}–${d2} ${monthYear}`;
  }

  return `${fmtDay(start)} – ${fmtDay(end)}`;
}
