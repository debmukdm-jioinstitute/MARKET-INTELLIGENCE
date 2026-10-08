import { fetchLiveCompanySentiment, type LiveCompanySentiment } from "./fetch-live";
import { getCachedSentiment, saveCachedSentiment } from "./store";
import { NIFTY_500 } from "@/lib/prowess/nifty500";
import { getNifty500CapTier } from "./nifty500-cap-tier";

/**
 * Multi-tier cache for Retail Alternative Sentiment:
 * 1. Memory Map cache (15 min)
 * 2. PostgreSQL cache (`reddit_sentiment_cache`)
 * 3. Live Reddit Crawler (attempted if cache expired or forceRefresh)
 *
 * There is NO seeded or synthesized fallback: when Reddit cannot be reached the caller gets an honest
 * "could not check" record (zero mentions plus fetchIssue), never invented mentions or percentages.
 */
const TTL_MS = 15 * 60_000;
const memoryCache = new Map<string, { at: number; data: LiveCompanySentiment }>();

export async function getLiveCompanySentimentCached(
  symbolRaw: string,
  options?: { forceRefresh?: boolean }
): Promise<LiveCompanySentiment> {
  const symbol = symbolRaw.toUpperCase().trim();

  // 1. Check in-memory cache
  if (!options?.forceRefresh) {
    const hit = memoryCache.get(symbol);
    if (hit && Date.now() - hit.at < TTL_MS && hit.data.totalMentions7D > 0 && !hit.data.fetchIssue) {
      return hit.data;
    }

    // 2. Check Database Cache
    const dbHit = await getCachedSentiment(symbol);
    if (dbHit && dbHit.totalMentions7D > 0 && !dbHit.fetchIssue) {
      memoryCache.set(symbol, { at: Date.now(), data: dbHit });
      return dbHit;
    }
  }

  // 3. Attempt live crawl from Reddit
  let liveData: LiveCompanySentiment | null = null;
  try {
    liveData = await fetchLiveCompanySentiment(symbol);
  } catch (err) {
    console.warn(`[reddit-sentiment] Live crawl failed for ${symbol}:`, err);
  }

  // If live crawl succeeded with real posts, persist and return
  if (liveData && liveData.totalMentions7D > 0 && !liveData.fetchIssue) {
    memoryCache.set(symbol, { at: Date.now(), data: liveData });
    saveCachedSentiment(liveData).catch(() => {});
    return liveData;
  }

  // Live crawl returned nothing usable. Report exactly that: the crawler's own record (a verified
  // zero, or zero plus fetchIssue) when it ran, otherwise a "could not check" record.
  if (liveData) return liveData;

  const row = NIFTY_500.find(([s]) => s === symbol);
  return {
    symbol,
    companyName: row?.[1] ?? symbol,
    sector: row?.[2] ?? "Indian Listed Equity",
    marketCapTier: getNifty500CapTier(symbol),
    noData: false,
    fetchIssue: "Reddit could not be reached, so retail sentiment is unavailable right now.",
    totalMentions7D: 0,
    positivePct: 0,
    negativePct: 0,
    neutralPct: 0,
    netSentimentScore: 0,
    communityDistribution: [],
    topPosts: [],
    fetchedAt: new Date().toISOString(),
    sentimentSource: "lexicon",
  };
}

/** Fixed, liquid watchlist checked live server-side */
export const RETAIL_SENTIMENT_WATCHLIST = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN",
  "TATAMOTORS", "ITC", "ZOMATO", "SUZLON", "ADANIENT", "BHARTIARTL",
];

/** Live sentiment for the fixed watchlist */
export async function getWatchlistLiveSentiment(): Promise<LiveCompanySentiment[]> {
  const settled = await Promise.allSettled(
    RETAIL_SENTIMENT_WATCHLIST.map((s) => getLiveCompanySentimentCached(s))
  );
  return settled
    .filter((r): r is PromiseFulfilledResult<LiveCompanySentiment> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((s) => s.totalMentions7D > 0)
    .sort((a, b) => b.totalMentions7D - a.totalMentions7D);
}
