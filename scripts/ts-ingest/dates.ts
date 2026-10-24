const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

/** "DD-Mon-YYYY" or "DD-MM-YYYY" → "YYYY-MM-DD" (no timezone shift). null if unparseable. */
export function parseDmy(s: string | undefined | null): string | null {
  const m = String(s ?? "").trim().match(/^(\d{1,2})[-/ ]([A-Za-z]{3}|\d{1,2})[-/ ](\d{4})$/);
  if (!m) return null;
  const mon = /^\d+$/.test(m[2]) ? Number(m[2]) : MON.findIndex((x) => x.toLowerCase() === m[2].toLowerCase()) + 1;
  if (mon < 1 || mon > 12) return null;
  return `${m[3]}-${pad(mon)}-${pad(Number(m[1]))}`;
}

/** Today in IST as YYYY-MM-DD. */
export const todayIst = (now = new Date()) => new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);

export const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);
export const isWeekend = (iso: string) => [0, 6].includes(new Date(`${iso}T00:00:00Z`).getUTCDay());
export const fmtYmd = (iso: string) => iso.replace(/-/g, "");
export const fmtDmy = (iso: string) => `${iso.slice(8, 10)}${iso.slice(5, 7)}${iso.slice(0, 4)}`;

/** Candidate trading dates (weekdays) strictly after `latest` up to `today` inclusive; capped to `max`. */
export function candidateDates(latest: string | null, today: string, since?: string, max = since ? 5000 : 40): string[] {
  const start = since ?? (latest ? addDays(latest, 1) : addDays(today, -7));
  const out: string[] = [];
  for (let d = start; d <= today; d = addDays(d, 1)) if (!isWeekend(d)) out.push(d);
  return out.slice(-max);
}
