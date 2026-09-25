import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { NextResponse } from "next/server";

/**
 * Cron auth. Fails CLOSED in production: if CRON_SECRET is unset the route is
 * locked rather than open to the world. Locally (no secret) it stays open.
 */
export function cronUnauthorized(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
    }
    return null;
  }
  return req.headers.get("authorization") === `Bearer ${secret}` ? null : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
}

const memHits = new Map<string, number[]>();

/** Sliding-window limiter. Shared via Postgres when a DB exists (works across serverless instances); in-memory otherwise. Returns true when the call is over the limit. */
export async function rateLimited(key: string, max: number, windowSec: number): Promise<boolean> {
  if (hasDatabase()) {
    try {
      await ensureSchema();
      const db = sql();
      await db`DELETE FROM rate_limits WHERE hit_at < now() - make_interval(secs => ${windowSec})`;
      await db`INSERT INTO rate_limits (key) VALUES (${key})`;
      const rows = (await db`SELECT count(*)::int AS n FROM rate_limits WHERE key = ${key} AND hit_at > now() - make_interval(secs => ${windowSec})`) as unknown as { n: number }[];
      return (rows[0]?.n ?? 0) > max;
    } catch {
      /* fall through to in-memory */
    }
  }
  const now = Date.now();
  const arr = (memHits.get(key) ?? []).filter((t) => now - t < windowSec * 1000);
  arr.push(now);
  memHits.set(key, arr);
  return arr.length > max;
}

export async function isFeatureEnabled(flag: string): Promise<boolean> {
  if (!hasDatabase()) return true;
  try {
    await ensureSchema();
    const rows = (await sql()`SELECT enabled FROM feature_flags WHERE flag = ${flag}`) as unknown as { enabled: boolean }[];
    return rows[0] ? rows[0].enabled : true;
  } catch {
    return true;
  }
}

/**
 * Gate for costly/abusable endpoints: requires a session cookie (guest ok),
 * honours the admin kill switch `flag`, and rate-limits per user+IP.
 * Returns a NextResponse to send back when blocked, or null to proceed.
 */
export async function guardExpensive(
  req: Request,
  opts: { name: string; flag?: string; max?: number; windowSec?: number; requireAccount?: boolean },
): Promise<NextResponse | null> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in or continue as guest to use this feature" }, { status: 401 });
  if (opts.requireAccount && user.guest) return NextResponse.json({ error: "Create a free account to use this feature" }, { status: 403 });
  if (opts.flag && !(await isFeatureEnabled(opts.flag))) {
    return NextResponse.json({ error: "This feature is temporarily disabled" }, { status: 503 });
  }
  if (await rateLimited(`${opts.name}:${user.email}:${clientIp(req)}`, opts.max ?? 10, opts.windowSec ?? 3600)) {
    return NextResponse.json({ error: "Rate limit reached — try again later" }, { status: 429 });
  }
  return null;
}
