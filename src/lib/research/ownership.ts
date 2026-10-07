/**
 * Deterministic ownership risk rules (no ML). The collector stays dumb; QoQ
 * deltas and flags are computed here from stored filings.
 */

export type OwnershipRow = {
  broadcastDate: string; // YYYY-MM-DD (NSE filing date)
  quarterEnd: string | null;
  promoterPct: number | null;
  fiiPct: number | null;
  diiPct: number | null;
  publicPct: number | null;
  pledgePct: number | null;
  shareholderCount: number | null;
  xbrlUrl: string | null;
};

export type OwnershipFlag = {
  label: "Promoter Risk" | "Promoter selling";
  severity: "high" | "medium";
  detail: string;
  broadcastDate: string;
  filingUrl: string | null;
};

export const PLEDGE_HIGH_PCT = 20;
export const PLEDGE_RISE_PP = 5;
export const PROMOTER_DROP_PP = 2;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-06-30" → "Jun 2026" (falls back to the filing date's month). */
export const quarterLabel = (r: Pick<OwnershipRow, "quarterEnd" | "broadcastDate">): string => {
  const d = r.quarterEnd ?? r.broadcastDate;
  return `${MONTHS[Number(d.slice(5, 7)) - 1] ?? "?"} ${d.slice(0, 4)}`;
};

const r1 = (n: number) => Math.round(n * 10) / 10;

/** `rowsAsc` = filings oldest → newest. Returns flags newest-first. */
export function computeOwnershipFlags(rowsAsc: OwnershipRow[]): OwnershipFlag[] {
  const flags: OwnershipFlag[] = [];
  for (let i = 0; i < rowsAsc.length; i++) {
    const cur = rowsAsc[i];
    const prev = i > 0 ? rowsAsc[i - 1] : null;
    const q = quarterLabel(cur);

    const level = cur.pledgePct !== null && cur.pledgePct > PLEDGE_HIGH_PCT;
    const rise = prev && prev.pledgePct !== null && cur.pledgePct !== null && cur.pledgePct - prev.pledgePct >= PLEDGE_RISE_PP;
    if (level || rise) {
      const riseText = rise && prev ? `Promoter pledging rose from ${r1(prev.pledgePct!)}% to ${r1(cur.pledgePct!)}% between the ${quarterLabel(prev)} and ${q} quarters.` : "";
      const levelText = level ? `Promoters have pledged or otherwise encumbered ${r1(cur.pledgePct!)}% of their shares (${q} quarter), above the ${PLEDGE_HIGH_PCT}% mark.` : "";
      flags.push({ label: "Promoter Risk", severity: level ? "high" : "medium", detail: [riseText, levelText].filter(Boolean).join(" "), broadcastDate: cur.broadcastDate, filingUrl: cur.xbrlUrl });
    }

    if (prev && prev.promoterPct !== null && cur.promoterPct !== null && prev.promoterPct - cur.promoterPct > PROMOTER_DROP_PP) {
      flags.push({
        label: "Promoter selling",
        severity: "medium",
        detail: `Promoter holding fell from ${r1(prev.promoterPct)}% to ${r1(cur.promoterPct)}% between the ${quarterLabel(prev)} and ${q} quarters.`,
        broadcastDate: cur.broadcastDate,
        filingUrl: cur.xbrlUrl,
      });
    }
  }
  return flags.reverse();
}

const qKey = (r: { quarterEnd: string | null; broadcastDate: string }) => r.quarterEnd ?? r.broadcastDate;

/**
 * Oldest -> newest by QUARTER, one filing per quarter (the most recently filed). Ordering by filing date alone
 * made a late re-filing of an old quarter (e.g. TCS March-quarter file posted in September) look like the
 * latest holding, hiding the newer June quarter.
 */
export function byQuarter(rows: OwnershipRow[]): OwnershipRow[] {
  const best = new Map<string, OwnershipRow>();
  for (const r of rows) {
    const k = qKey(r);
    const cur = best.get(k);
    if (!cur || r.broadcastDate > cur.broadcastDate) best.set(k, r);
  }
  return [...best.values()].sort((a, b) => (qKey(a) < qKey(b) ? -1 : qKey(a) > qKey(b) ? 1 : 0));
}

