import type { PromoterFeedSnapshot } from "@/lib/promoters/feed-types";

const TTL_MS = 15 * 60_000;

let snapshot: PromoterFeedSnapshot | null = null;
let cachedAt = 0;

export function getPromoterFeedSnapshot(): PromoterFeedSnapshot | null {
  if (!snapshot || Date.now() - cachedAt > TTL_MS) return null;
  return snapshot;
}

export function setPromoterFeedSnapshot(next: PromoterFeedSnapshot): void {
  snapshot = next;
  cachedAt = Date.now();
}

export function peekPromoterFeedSnapshot(): PromoterFeedSnapshot | null {
  return snapshot;
}
