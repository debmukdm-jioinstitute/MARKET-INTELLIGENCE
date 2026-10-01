import { getCreditFeedSnapshot, setCreditFeedSnapshot } from "@/lib/credit/feed-cache";
import { fetchCreditRatingFeed, type FetchCreditFeedOptions } from "@/lib/credit/fetch-feed";
import { loadCreditFeedItemsFromDb } from "@/lib/credit/persist";
import type { CreditFeedSnapshot } from "@/lib/credit/types";

export async function loadCreditFeedSnapshot(opts?: FetchCreditFeedOptions): Promise<CreditFeedSnapshot> {
  const cached = getCreditFeedSnapshot();
  if (cached && !opts?.deep) return cached;

  const live = await fetchCreditRatingFeed(opts);
  if (live.dataStatus === "AVAILABLE" && live.items.length > 0) {
    setCreditFeedSnapshot(live);
    return live;
  }

  const fromDb = await loadCreditFeedItemsFromDb();
  if (fromDb.length > 0) {
    const snap: CreditFeedSnapshot = {
      items: fromDb,
      asOf: new Date().toISOString(),
      collectorsUsed: ["google-news"],
      dataStatus: "AVAILABLE",
      message: `${fromDb.length} archived rating actions from database (live fetch empty).`,
    };
    setCreditFeedSnapshot(snap);
    return snap;
  }

  setCreditFeedSnapshot(live);
  return live;
}
