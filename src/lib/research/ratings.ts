/**
 * Credit-rating view built from stored agency rows. Deterministic and
 * conservative: radar events come only from rating ACTIONS the agency itself
 * took (downgrade, new negative outlook, negative credit watch) — snapshot
 * rows never imply a direction, and rationale text is never read.
 */

export const AGENCY_ORDER = ["CRISIL", "CARE", "ICRA"] as const;
export const RADAR_WINDOW_DAYS = 90;

export type RatingRowView = {
  agency: string;
  rating: string | null;
  notch: string | null;
  outlook: string | null;
  watch: string | null;
  action: string | null;
  actionDate: string; // YYYY-MM-DD
  rationaleUrl: string | null;
  source: string | null;
};

export type AgencyCell = {
  agency: string;
  covered: boolean;
  rating: string | null;
  notch: string | null;
  outlook: string | null;
  watch: string | null;
  lastAction: string | null;
  lastActionDate: string | null;
  rationaleUrl: string | null;
};

export type RatingEvent = {
  type: "downgrade" | "negative-outlook" | "watch-negative" | "disclosure";
  agency: string | null;
  date: string;
  rating: string | null;
  detail: string;
  link: string | null;
  source: string;
};

export type FilingDisclosure = {
  date: string;
  headline: string;
  url: string | null;
  agency?: string | null;
  rating?: string | null;
};

const isAction = (r: RatingRowView) => r.action !== "current" && r.action !== "rationale";

export function buildAgencyGrid(rows: RatingRowView[]): AgencyCell[] {
  return AGENCY_ORDER.map((agency) => {
    const mine = rows.filter((r) => r.agency === agency).sort((a, b) => (a.actionDate < b.actionDate ? 1 : -1));
    const rated = mine.find((r) => r.rating !== null);
    // Latest dated thing the agency did: a rating action, else a published rationale.
    const last = mine.find(isAction) ?? mine.find((r) => r.action === "rationale") ?? null;
    if (!rated && !last) return { agency, covered: false, rating: null, notch: null, outlook: null, watch: null, lastAction: null, lastActionDate: null, rationaleUrl: null };
    return {
      agency,
      covered: true,
      rating: rated?.rating ?? null,
      notch: rated?.notch ?? null,
      outlook: rated?.outlook ?? null,
      watch: rated?.watch ?? null,
      lastAction: last?.action ?? null,
      lastActionDate: last?.actionDate ?? null,
      rationaleUrl: last?.rationaleUrl ?? rated?.rationaleUrl ?? null,
    };
  });
}

/** Newest-first events. `disclosures` = NSE "Credit rating" filings (informational — the headline carries no direction). */
export function buildRatingEvents(rows: RatingRowView[], disclosures: FilingDisclosure[] = []): RatingEvent[] {
  const events: RatingEvent[] = [];
  for (const r of rows.filter(isAction)) {
    const base = { agency: r.agency, date: r.actionDate, rating: r.rating, link: r.rationaleUrl, source: r.source ?? "" };
    if (r.action === "downgrade") events.push({ ...base, type: "downgrade", detail: `${r.agency} downgraded the rating${r.rating ? ` to ${r.rating}` : ""}.` });
    else if (r.watch === "negative") events.push({ ...base, type: "watch-negative", detail: `${r.agency} placed the rating on negative credit watch${r.rating ? ` (${r.rating})` : ""}.` });
    else if (r.outlook === "negative") events.push({ ...base, type: "negative-outlook", detail: `${r.agency} gave a negative outlook${r.rating ? ` on ${r.rating}` : ""}.` });
  }
  for (const d of disclosures) {
    events.push({
      type: "disclosure",
      agency: d.agency ?? null,
      date: d.date,
      rating: d.rating ?? null,
      detail: d.headline,
      link: d.url,
      source: "NSE_FILING",
    });
  }
  return events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** True when a downgrade / negative outlook / negative watch happened within the radar window. */
export function hasRecentAlert(events: RatingEvent[], now = new Date()): boolean {
  const cutoff = new Date(now.getTime() - RADAR_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  return events.some((e) => e.type !== "disclosure" && e.date >= cutoff);
}
