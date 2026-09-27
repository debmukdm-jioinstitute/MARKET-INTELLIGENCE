import type { IpoDetail, IpoGmpFields, IpoListing } from "@/lib/feeds/ipo/types";
import { fetchIpoWatchGmp, matchGmpToName, type IpoGmpQuote } from "@/lib/feeds/sources/ipowatch-gmp";

function toGmpFields(match: IpoGmpQuote | null): IpoGmpFields {
  if (!match) return { gmpInr: null, gmpPct: null, gmpSource: null };
  return {
    gmpInr: match.gmpInr,
    gmpPct: match.estListingGainPct,
    gmpSource: match.source,
  };
}

/** Attach best-effort GMP (IPO Watch) onto Upstox IPO rows. Fail-soft: nulls on miss. */
export async function enrichIpoListWithGmp(ipos: IpoListing[]): Promise<IpoListing[]> {
  if (!ipos.length) return ipos;
  const gmpRows = await fetchIpoWatchGmp();
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
