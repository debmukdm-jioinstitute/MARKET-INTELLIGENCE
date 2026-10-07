import { NextResponse } from "next/server";
import { cacheGetJson, cacheSetJson, hasRedis } from "@/lib/cache/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health/cache -> is the shared Upstash Redis cache live in THIS deployment?
 * Safe to expose: reports only which env-var NAMES are present (never values) and a
 * round-trip write/read of a tiny throwaway key (60 s TTL).
 *   { ok: true,  configured: true,  envPair: "UPSTASH_REDIS_REST_*", roundTripMs: 42 }
 *   { ok: false, configured: false, envPair: null }   <- env vars missing: add them + redeploy
 */
export async function GET() {
  const envPair =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
      ? "UPSTASH_REDIS_REST_*"
      : process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
        ? "KV_REST_API_*"
        : null;
  const headers = { "Cache-Control": "no-store" };
  if (!hasRedis()) {
    return NextResponse.json({ ok: false, configured: false, envPair }, { headers });
  }
  const t0 = Date.now();
  const stamp = `${t0}-${Math.random().toString(36).slice(2, 8)}`;
  const key = `health:cache:ping:${stamp}`; // unique per request, so parallel checks never collide
  await cacheSetJson(key, stamp, 60);
  const back = await cacheGetJson<string>(key);
  const ok = back?.value === stamp;
  return NextResponse.json(
    { ok, configured: true, envPair, roundTripMs: Date.now() - t0, region: process.env.VERCEL_REGION ?? null },
    { status: ok ? 200 : 503, headers },
  );
}
