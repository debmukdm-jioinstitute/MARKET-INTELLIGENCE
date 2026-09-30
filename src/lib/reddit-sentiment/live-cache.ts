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
