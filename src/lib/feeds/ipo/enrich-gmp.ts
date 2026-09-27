import type { IpoDetail, IpoGmpFields, IpoListing, IpoStatus } from "@/lib/feeds/ipo/types";
import { fetchIpoWatchGmp, matchGmpToName, type IpoGmpQuote } from "@/lib/feeds/sources/ipowatch-gmp";

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
 * Attach best-effort GMP (IPO Watch) onto Upstox IPO rows.
 * When the broker calendar is empty for open/upcoming, surface GMP calendar
 * rows so active IPO research still shows premiums.
 */
export async function enrichIpoListWithGmp(
  ipos: IpoListing[],
  status: IpoStatus = "open",
): Promise<IpoListing[]> {
  const gmpRows = await fetchIpoWatchGmp();
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
  const gmpRows = await fetchIpoWatchGmp();
  const match = gmpRows.length ? matchGmpToName(gmpRows, detail.name, detail.symbol) : null;
  return { ...detail, ...toGmpFields(match) };
}
