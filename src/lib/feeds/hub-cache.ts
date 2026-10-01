import { buildFeedHub } from "@/lib/feeds/hub";
import type { FeedHubPayload } from "@/lib/feeds/types";

let cache: { at: number; payload: FeedHubPayload } | null = null;
let inFlightPromise: Promise<FeedHubPayload> | null = null;

export const FEED_HUB_TTL_MS = 30_000;

export async function getFeedHubCached(force = false): Promise<FeedHubPayload> {
  const now = Date.now();
  if (!force && cache && now - cache.at < FEED_HUB_TTL_MS) {
    return cache.payload;
  }
  if (inFlightPromise) {
    return inFlightPromise;
  }
  inFlightPromise = buildFeedHub()
    .then((payload) => {
      cache = { at: Date.now(), payload };
      inFlightPromise = null;
      return payload;
    })
    .catch((err) => {
      inFlightPromise = null;
      throw err;
    });
  return inFlightPromise;
}

export function peekFeedHubCache(): FeedHubPayload | null {
  return cache?.payload ?? null;
}
