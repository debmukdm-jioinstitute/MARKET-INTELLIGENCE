import { fetchLiveCompanySentiment, type LiveCompanySentiment } from "./fetch-live";

/** Short in-memory cache so re-rendering or two users hitting the same symbol within a few
 * minutes don't each trigger a fresh round of Reddit searches — this is a real-data fetch with
 * real network latency and Reddit's own rate limits, not a free in-memory lookup. */
const TTL_MS = 10 * 60_000;
const cache = new Map<string, { at: number; data: LiveCompanySentiment }>();

export async function getLiveCompanySentimentCached(symbol: string): Promise<LiveCompanySentiment> {
  const key = symbol.toUpperCase().trim();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const data = await fetchLiveCompanySentiment(key);
  cache.set(key, { at: Date.now(), data });
  return data;
}

/** Fixed, liquid watchlist checked live server-side wherever a caller needs "top buzzing names"
 * without an honest way to scan the full Nifty 500 in real time (dashboard cards, notifications,
 * the site-wide brief). Never grows to a full universe scan — see fetch-live.ts for why. */
export const RETAIL_SENTIMENT_WATCHLIST = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN",
  "TATAMOTORS", "ITC", "ZOMATO", "SUZLON", "ADANIENT", "BHARTIARTL",
];

/** Live sentiment for the fixed watchlist, symbols that failed or found nothing dropped, sorted by
 * real mention count. Each symbol still goes through the 10-min cache, so calling this repeatedly
 * (e.g. once per notification-detection run) doesn't re-hit Reddit every time. */
export async function getWatchlistLiveSentiment(): Promise<LiveCompanySentiment[]> {
  const settled = await Promise.allSettled(RETAIL_SENTIMENT_WATCHLIST.map((s) => getLiveCompanySentimentCached(s)));
  return settled
    .filter((r): r is PromiseFulfilledResult<LiveCompanySentiment> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((s) => !s.fetchIssue && s.totalMentions7D > 0)
    .sort((a, b) => b.totalMentions7D - a.totalMentions7D);
}
