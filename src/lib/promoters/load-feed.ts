import { getPromoterFeedSnapshot, setPromoterFeedSnapshot } from "@/lib/promoters/feed-cache";
import { fetchPromoterDisclosureFeed, type FetchPromoterFeedOptions } from "@/lib/promoters/fetch-feed";
import { loadPromoterFeedItemsFromDb } from "@/lib/promoters/persist";
import type { PromoterFeedSnapshot } from "@/lib/promoters/feed-types";

export async function loadPromoterFeedSnapshot(opts?: FetchPromoterFeedOptions): Promise<PromoterFeedSnapshot> {
  const cached = getPromoterFeedSnapshot();
  if (cached && !opts?.deep) return cached;

  const live = await fetchPromoterDisclosureFeed(opts);
  if (live.dataStatus === "AVAILABLE" && live.items.length > 0) {
    setPromoterFeedSnapshot(live);
    return live;
  }

  const fromDb = await loadPromoterFeedItemsFromDb();
  if (fromDb.length > 0) {
    const snap: PromoterFeedSnapshot = {
      items: fromDb,
      asOf: new Date().toISOString(),
      collectorsUsed: ["google-news"],
      dataStatus: "AVAILABLE",
      message: `${fromDb.length} archived disclosures from database (live fetch empty).`,
    };
    setPromoterFeedSnapshot(snap);
    return snap;
  }

  setPromoterFeedSnapshot(live);
  return live;
}
