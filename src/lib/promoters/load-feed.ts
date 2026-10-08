import { getPromoterFeedSnapshot, setPromoterFeedSnapshot } from "@/lib/promoters/feed-cache";
import { fetchPromoterDisclosureFeed, type FetchPromoterFeedOptions } from "@/lib/promoters/fetch-feed";
import { loadPromoterFeedItemsFromDb, loadPromoterLastRefresh } from "@/lib/promoters/persist";
import type { PromoterFeedSnapshot } from "@/lib/promoters/feed-types";

/** Archive older than this triggers a light live (RSS-only) top-up on the request path. */
const DB_FRESH_MS = 6 * 3_600_000;
/** Beyond this the page says so out loud instead of looking current. */
const STALE_WARN_MS = 30 * 3_600_000;

function staleNote(asOf: string): string {
  const age = Date.now() - Date.parse(asOf);
  return age > STALE_WARN_MS
    ? ` ⚠ Last successful refresh ${Math.round(age / 3_600_000)}h ago — scheduled collector may be failing.`
    : "";
}

/**
 * DB-first read: the collector (GitHub Actions, every 3h) does the heavy NSE pull and persists;
 * user requests only read an indexed table (fast, near-zero CPU). Live RSS is a top-up only when
 * the archive is empty/stale, and never calls NSE from Vercel unless deep (cron fallback route).
 */
export async function loadPromoterFeedSnapshot(opts?: FetchPromoterFeedOptions): Promise<PromoterFeedSnapshot> {
  const cached = getPromoterFeedSnapshot();
  if (cached && !opts?.deep) return cached;

  const [fromDb, lastRefresh] = await Promise.all([
    loadPromoterFeedItemsFromDb().catch(() => []),
    loadPromoterLastRefresh().catch(() => null),
  ]);
  const dbFresh = lastRefresh !== null && Date.now() - Date.parse(lastRefresh) < DB_FRESH_MS;

  if (fromDb.length > 0 && dbFresh && !opts?.deep) {
    const snap: PromoterFeedSnapshot = {
      items: fromDb,
      asOf: lastRefresh!,
      collectorsUsed: [...new Set(fromDb.map((i) => i.collector))],
      dataStatus: "AVAILABLE",
      message: `${fromDb.length} disclosures (NSE filings + news), refreshed ${new Date(lastRefresh!).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST. Verify on NSE/BSE before acting.`,
    };
    setPromoterFeedSnapshot(snap);
    return snap;
  }

  const live = await fetchPromoterDisclosureFeed({ ...opts, native: Boolean(opts?.deep) });
  if (live.dataStatus === "AVAILABLE" && live.items.length > 0) {
    // Merge with archive so a thin live pull never hides history.
    const seen = new Set(live.items.map((i) => i.id));
    const items = [...live.items, ...fromDb.filter((i) => !seen.has(i.id))]
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
      .slice(0, 200);
    const snap = { ...live, items, message: live.message + staleNote(lastRefresh ?? live.asOf) };
    setPromoterFeedSnapshot(snap);
    return snap;
  }

  if (fromDb.length > 0) {
    const asOf = lastRefresh ?? new Date().toISOString();
    const snap: PromoterFeedSnapshot = {
      items: fromDb,
      asOf,
      collectorsUsed: [...new Set(fromDb.map((i) => i.collector))],
      dataStatus: "AVAILABLE",
      message: `${fromDb.length} archived disclosures (live fetch empty).${staleNote(asOf)}`,
    };
    setPromoterFeedSnapshot(snap);
    return snap;
  }

  setPromoterFeedSnapshot(live);
  return live;
}
