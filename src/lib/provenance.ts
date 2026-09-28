export const DATA_ISSUE_EMAIL = "Deb@getmarketintelligence.in";

/** Ages beyond this with no stated delay are flagged stale. Documented on /methodology#freshness. */
export const STALE_AFTER_MINUTES = 60;

/** "10:42:18 IST", with the date prefixed when it is not today (IST). */
export function formatAsOfIst(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const tz = "Asia/Kolkata";
  const time = d.toLocaleTimeString("en-GB", { timeZone: tz, hour12: false });
  const day = d.toLocaleDateString("en-CA", { timeZone: tz });
  const today = new Date().toLocaleDateString("en-CA", { timeZone: tz });
  return day === today ? `${time} IST` : `${d.toLocaleDateString("en-GB", { timeZone: tz, day: "2-digit", month: "short", year: "numeric" })}, ${time} IST`;
}

export type Freshness = { label: string; tone: "live" | "delayed" | "stale" | "unknown" };

/**
 * Badge derived from a measurable condition, never decoration:
 * - stated delay 0 → Live; stated delay N → Delayed N min
 * - no stated delay → age of the timestamp, Stale past STALE_AFTER_MINUTES
 * - no timestamp → No timestamp
 */
export function freshness(asOf: string | null | undefined, delayMinutes?: number, now = Date.now()): Freshness {
  if (delayMinutes === 0) return { label: "Live", tone: "live" };
  if (delayMinutes && delayMinutes > 0) return { label: `Delayed ${delayMinutes} min`, tone: "delayed" };
  const t = asOf ? Date.parse(asOf) : NaN;
  if (Number.isNaN(t)) return { label: "No timestamp", tone: "unknown" };
  const mins = Math.max(0, Math.round((now - t) / 60_000));
  if (mins > STALE_AFTER_MINUTES) {
    const h = Math.round(mins / 60);
    return { label: h < 48 ? `Stale · ${h}h old` : `Stale · ${Math.round(h / 24)}d old`, tone: "stale" };
  }
  return { label: mins < 1 ? "Updated <1 min ago" : `Updated ${mins} min ago`, tone: "delayed" };
}

export function dataIssueHref(datum: string, extra?: Record<string, string | null | undefined>): string {
  const lines = [`Datum: ${datum}`, ...Object.entries(extra ?? {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), "", "What looks wrong:"];
  const q = new URLSearchParams({ subject: `Data issue: ${datum}`, body: lines.join("\n") });
  return `mailto:${DATA_ISSUE_EMAIL}?${q.toString().replace(/\+/g, "%20")}`;
}
