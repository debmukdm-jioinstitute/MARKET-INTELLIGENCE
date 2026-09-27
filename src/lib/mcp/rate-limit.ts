import { createHash } from "crypto";

const digest = (s: string) => createHash("sha256").update(s).digest("hex");

const buckets = new Map<string, number[]>();

/** Sliding window limit per serverless instance (best-effort). */
export function mcpRateLimited(key: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const id = digest(key);
  const arr = (buckets.get(id) ?? []).filter((t) => now - t < 60_000);
  arr.push(now);
  buckets.set(id, arr);
  return arr.length > maxPerMinute;
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
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
