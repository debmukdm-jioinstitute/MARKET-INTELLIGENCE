import type { CreditFeedSnapshot } from "@/lib/credit/types";

const TTL_MS = 15 * 60_000;

let snapshot: CreditFeedSnapshot | null = null;
let cachedAt = 0;

export function getCreditFeedSnapshot(): CreditFeedSnapshot | null {
  if (!snapshot || Date.now() - cachedAt > TTL_MS) return null;
  return snapshot;
}

export function setCreditFeedSnapshot(next: CreditFeedSnapshot): void {
  snapshot = next;
  cachedAt = Date.now();
}

export function peekCreditFeedSnapshot(): CreditFeedSnapshot | null {
  return snapshot;
}
