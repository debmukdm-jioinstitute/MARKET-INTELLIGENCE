import { createHash } from "crypto";
import { clientIp as cloudflareAwareClientIp } from "@/lib/client-ip";

const digest = (s: string) => createHash("sha256").update(s).digest("hex");

/** Maximum keys tracked in memory to prevent unbounded memory growth in long-running instances. */
const MAX_ENTRIES = 10_000;
const WINDOW_MS = 60_000;

const buckets = new Map<string, number[]>();
let lastSweep = Date.now();

/** Periodically evict stale entries and enforce size limits. */
function pruneBuckets(now: number) {
  if (now - lastSweep < 30_000 && buckets.size < MAX_ENTRIES) return;
  lastSweep = now;

  for (const [key, timestamps] of buckets.entries()) {
    const valid = timestamps.filter((t) => now - t < WINDOW_MS);
    if (valid.length === 0) {
      buckets.delete(key);
    } else if (valid.length !== timestamps.length) {
      buckets.set(key, valid);
    }
  }

  // If still over cap, evict oldest entries
  if (buckets.size > MAX_ENTRIES) {
    const keysToDelete = Array.from(buckets.keys()).slice(0, buckets.size - MAX_ENTRIES);
    for (const k of keysToDelete) buckets.delete(k);
  }
}

/** Sliding window rate limit per instance with automatic TTL and bounded size. */
export function mcpRateLimited(key: string, maxPerMinute: number): boolean {
  const now = Date.now();
  pruneBuckets(now);

  const id = digest(key);
  const arr = (buckets.get(id) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  buckets.set(id, arr);
  return arr.length > maxPerMinute;
}

export function clientIp(req: Request): string {
  // Cloudflare-aware: trust CF-Connecting-IP first (spoof-proof behind the
  // proxy); keep the historical "unknown" fallback so existing rate-limit
  // keys and log lines keep their shape.
  return cloudflareAwareClientIp(req, "unknown");
}

/** Higher cap when owner issued MCP_API_KEY or user signed in. */
export function rateLimitKey(req: Request, ctx: { user: { email: string } | null; apiKey: string | null }): string {
  if (ctx.user?.email) return `user:${ctx.user.email}`;
  if (ctx.apiKey) return `key:${digest(ctx.apiKey).slice(0, 16)}`;
  return `ip:${clientIp(req)}`;
}

export function rateLimitCap(ctx: { user: { email: string } | null; apiKey: string | null }): number {
  if (ctx.apiKey) return 120;
  if (ctx.user) return 90;
  return 45;
}
