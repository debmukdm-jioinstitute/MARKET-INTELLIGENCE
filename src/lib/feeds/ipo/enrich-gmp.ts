import type { IpoDetail, IpoGmpFields, IpoListing, IpoStatus } from "@/lib/feeds/ipo/types";
import { fetchChittorgarhIpoGmp } from "@/lib/feeds/sources/chittorgarh-ipo-gmp";
import {
  fetchIpoWatchGmp,
  ipoNameMatchKey,
  matchGmpToName,
  type IpoGmpQuote,
} from "@/lib/feeds/sources/ipowatch-gmp";

function mergeGmpRows(primary: IpoGmpQuote[], secondary: IpoGmpQuote[]): IpoGmpQuote[] {
  const byKey = new Map<string, IpoGmpQuote>();
  for (const row of secondary) byKey.set(ipoNameMatchKey(row.name), row);
  for (const row of primary) {
    const key = ipoNameMatchKey(row.name);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, row);
      continue;
    }
    byKey.set(key, {
      ...prev,
      ...row,
      gmpInr: row.gmpInr ?? prev.gmpInr,
      estListingGainPct: row.estListingGainPct ?? prev.estListingGainPct,
      priceBandInr: row.priceBandInr ?? prev.priceBandInr,
      estListingInr: row.estListingInr ?? prev.estListingInr,
      dateWindow: row.dateWindow ?? prev.dateWindow,
      status: row.status ?? prev.status,
      source: row.gmpInr != null ? row.source : prev.source,
    });
  }
  return [...byKey.values()];
}

async function loadGmpRows(): Promise<IpoGmpQuote[]> {
  const [chitt, watch] = await Promise.all([fetchChittorgarhIpoGmp(), fetchIpoWatchGmp()]);
  return mergeGmpRows(chitt, watch);
}

function toGmpFields(match: IpoGmpQuote | null): IpoGmpFields {
  if (!match) return { gmpInr: null, gmpPct: null, gmpSource: null };
  return {
    gmpInr: match.gmpInr,
    gmpPct: match.estListingGainPct,
    gmpSource: match.source,
  };
}

function compactName(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 24);
}

function listingFromGmp(row: IpoGmpQuote, index: number, status: IpoStatus): IpoListing {
  const band = row.priceBandInr ?? 0;
  return {
    id: `gmp-${index}-${compactName(row.name)}`,
    symbol: compactName(row.name).slice(0, 20) || `GMP${index}`,
    name: row.name,
    status,
    isin: "",
    issueType: "regular",
    issueSize: 0,
    industry: "Grey market calendar",
    minPrice: band,
    maxPrice: band,
    biddingStartDate: row.dateWindow ?? "—",
    biddingEndDate: row.dateWindow ?? "—",
    totalSubscription: null,
    ...toGmpFields(row),
  };
}

/**
 * Attach best-effort GMP (Chittorgarh + IPO Watch) onto Upstox IPO rows.
 * When the broker calendar is empty for open/upcoming, surface GMP calendar
 * rows so active IPO research still shows premiums.
 */
export async function enrichIpoListWithGmp(
  ipos: IpoListing[],
  status: IpoStatus = "open",
): Promise<IpoListing[]> {
  const gmpRows = await loadGmpRows();
  if (!ipos.length) {
    if (status !== "open" && status !== "upcoming") return [];
    return gmpRows
      .filter((r) => new RegExp(`^${status}$`, "i").test((r.status ?? "").trim()))
      .slice(0, 30)
      .map((r, i) => listingFromGmp(r, i, status));
  }
  if (!gmpRows.length) {
    return ipos.map((ipo) => ({ ...ipo, gmpInr: null, gmpPct: null, gmpSource: null }));
  }
  return ipos.map((ipo) => {
    const match = matchGmpToName(gmpRows, ipo.name, ipo.symbol);
    return { ...ipo, ...toGmpFields(match) };
  });
}

export async function enrichIpoDetailWithGmp(detail: IpoDetail): Promise<IpoDetail> {
  const gmpRows = await loadGmpRows();
  const match = gmpRows.length ? matchGmpToName(gmpRows, detail.name, detail.symbol) : null;
  return { ...detail, ...toGmpFields(match) };
}
