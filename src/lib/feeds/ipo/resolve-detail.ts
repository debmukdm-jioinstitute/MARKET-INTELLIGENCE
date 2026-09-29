import { enrichIpoDetailWithGmp, enrichIpoListWithGmp } from "@/lib/feeds/ipo/enrich-gmp";
import type { IpoDetail, IpoStatus } from "@/lib/feeds/ipo/types";
import { fetchUpstoxIpoDetail } from "@/lib/feeds/sources/upstox";

export async function resolveIpoDetail(ipoId: string): Promise<IpoDetail | null> {
  const detail = await fetchUpstoxIpoDetail(ipoId);
  if (detail) return enrichIpoDetailWithGmp(detail);
  if (!ipoId.startsWith("gmp-")) return null;
  for (const status of ["open", "upcoming"] as IpoStatus[]) {
    const rows = await enrichIpoListWithGmp([], status);
    const hit = rows.find((r) => r.id === ipoId);
    if (!hit) continue;
    return {
      ...hit,
      faceValue: null,
      lotSize: null,
      minimumQuantity: null,
      cutOffPrice: null,
      listingPrice: null,
      listingExchange: null,
      rhpUrl: null,
      drhpUrl: null,
      timeline: {},
      registrar: null,
    };
  }
  return null;
}
