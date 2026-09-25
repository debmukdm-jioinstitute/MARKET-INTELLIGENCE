const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

/** In-memory per-user rate limit for the site assistant API (single Node instance). */
export function checkSiteAssistantRateLimit(key: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (bucket.count >= MAX_REQUESTS) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - bucket.windowStart)) / 1000);
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  bucket.count += 1;
  return { ok: true };
}
