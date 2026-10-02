/**
 * Deterministic IPO helpers (no ML): subscription momentum from append-only
 * snapshots, and the apply checklist. Nothing here predicts a listing price.
 */

export const STAGES = ["drhp_filed", "sebi_nod", "open", "allotment", "listed"] as const;
export type StageId = (typeof STAGES)[number];
export const STAGE_LABEL: Record<StageId, string> = {
  drhp_filed: "DRHP filed",
  sebi_nod: "SEBI nod / dates set",
  open: "Open",
  allotment: "Allotment",
  listed: "Listed",
};

export type SnapshotPoint = { at: string; qibX: number | null; niiX: number | null; riiX: number | null; totalX: number | null };
export type Momentum = {
  latest: SnapshotPoint | null;
  /** Change vs the snapshot closest to 24h earlier (needs one that is at least 12h old). */
  delta: { qibX: number | null; niiX: number | null; riiX: number | null; totalX: number | null } | null;
  /** "Heating up": retail (RII) demand is rising fast — day-over-day gain of ≥ 1.0× and above the previous day's gain. Plain arithmetic, no model. */
  heatingUp: boolean;
};

const diff = (a: number | null, b: number | null) => (a === null || b === null ? null : Math.round((a - b) * 100) / 100);
const HOUR = 3_600_000;

/** `snaps` oldest → newest. */
export function computeMomentum(snaps: SnapshotPoint[]): Momentum {
  const latest = snaps[snaps.length - 1] ?? null;
  if (!latest) return { latest: null, delta: null, heatingUp: false };
  const t = Date.parse(latest.at);
  const before = (hoursAgo: number, from: number) => {
    // snapshot nearest to `hoursAgo` hours before `from`, but at least half that old
    let best: SnapshotPoint | null = null;
    for (const s of snaps) {
      const age = (from - Date.parse(s.at)) / HOUR;
      if (age >= hoursAgo / 2 && (!best || Math.abs(age - hoursAgo) < Math.abs((from - Date.parse(best.at)) / HOUR - hoursAgo))) best = s;
    }
    return best;
  };
  const dayAgo = before(24, t);
  const delta = dayAgo ? { qibX: diff(latest.qibX, dayAgo.qibX), niiX: diff(latest.niiX, dayAgo.niiX), riiX: diff(latest.riiX, dayAgo.riiX), totalX: diff(latest.totalX, dayAgo.totalX) } : null;
  let heatingUp = false;
  if (dayAgo && delta?.riiX != null) {
    const twoDays = before(24, Date.parse(dayAgo.at));
    const prevGain = twoDays ? diff(dayAgo.riiX, twoDays.riiX) : null;
    heatingUp = delta.riiX >= 1 && (prevGain === null || delta.riiX > prevGain);
  }
  return { latest, delta, heatingUp };
}

/** Minimum application: one lot at the upper price band. Null when either input is unknown. */
export function applyChecklist(lotSize: number | null, priceHigh: number | null): { lotSize: number | null; minInvestmentInr: number | null } {
  return { lotSize, minInvestmentInr: lotSize && priceHigh ? Math.round(lotSize * priceHigh) : null };
}
