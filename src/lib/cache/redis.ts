/**
 * Shared Upstash Redis cache (P1). Optional: when no Redis env vars are set every
 * helper is a no-op and callers fall through to their existing behaviour.
 *
 * Env (either pair works; the Vercel Marketplace integration sets the KV_* pair):
 *   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 *   KV_REST_API_URL        / KV_REST_API_TOKEN
 *
 * Values are stored as gzip+base64 JSON envelopes { t: storedAtMs, v: value } so a
 * ~200 KB dossier costs ~40-60 KB of Upstash bandwidth.
 * Server-only (uses node:zlib). Never import from a "use client" file.
 */
import { Redis } from "@upstash/redis";
import { gunzipSync, gzipSync } from "node:zlib";

let client: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token, automaticDeserialization: false }) : null;
  return client;
}

export function hasRedis(): boolean {
  return getRedis() !== null;
}

/** Redis must never make a request slower than the upstream it protects. */
const REDIS_TIMEOUT_MS = 800;

function withTimeout<T>(p: Promise<T>, ms = REDIS_TIMEOUT_MS): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

type Envelope<T> = { t: number; v: T };

function encode<T>(value: T): string {
  const env: Envelope<T> = { t: Date.now(), v: value };
  return `gz:${gzipSync(Buffer.from(JSON.stringify(env), "utf8")).toString("base64")}`;
}

function decode<T>(raw: string): Envelope<T> | null {
  try {
    const json = raw.startsWith("gz:")
      ? gunzipSync(Buffer.from(raw.slice(3), "base64")).toString("utf8")
      : raw;
    const env = JSON.parse(json) as Envelope<T>;
    return typeof env?.t === "number" ? env : null;
  } catch {
    return null;
  }
}

export async function cacheGetJson<T>(key: string): Promise<{ value: T; ageMs: number } | null> {
  const r = getRedis();
  if (!r) return null;
  const raw = await withTimeout(r.get<string>(key));
  if (typeof raw !== "string") return null;
  const env = decode<T>(raw);
  return env ? { value: env.v, ageMs: Date.now() - env.t } : null;
}

export async function cacheSetJson(key: string, value: unknown, ttlSec: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await withTimeout(r.set(key, encode(value), { ex: Math.max(1, Math.floor(ttlSec)) }), 2_000);
}

export type CacheStatus = "hit" | "stale" | "miss" | "off";

/**
 * Stale-while-revalidate read-through cache.
 * - fresh (age < freshMs): return cached value.
 * - stale (freshMs <= age < ttlSec): return cached value now and refresh in `schedule`
 *   (pass `after` from "next/server" in route handlers); one refresher at a time via a lock key.
 * - miss: await loader(), store non-null results.
 * Null loader results are never cached.
 */
export async function cachedSWR<T>(
  key: string,
  opts: { freshMs: number; ttlSec: number; shouldCache?: (value: T) => boolean },
  loader: () => Promise<T | null>,
  schedule?: (task: () => Promise<void>) => void,
): Promise<{ value: T | null; cache: CacheStatus }> {
  if (!hasRedis()) return { value: await loader(), cache: "off" };

  const hit = await cacheGetJson<T>(key);
  if (hit && hit.ageMs < opts.freshMs) return { value: hit.value, cache: "hit" };

  if (hit && schedule) {
    schedule(async () => {
      const r = getRedis();
      const gotLock = r ? await withTimeout(r.set(`${key}:lock`, "1", { nx: true, ex: 30 })) : null;
      if (!gotLock) return;
      try {
        const fresh = await loader();
        if (fresh !== null && (opts.shouldCache?.(fresh) ?? true)) await cacheSetJson(key, fresh, opts.ttlSec);
      } catch {
        /* keep serving the stale copy */
      }
    });
    return { value: hit.value, cache: "stale" };
  }

  const value = await loader();
  if (value !== null && (opts.shouldCache?.(value) ?? true)) await cacheSetJson(key, value, opts.ttlSec);
  return { value, cache: "miss" };
}

/** One MGET for many keys; result[i] is null on miss/timeout/decode failure. */
export async function cacheGetManyJson<T>(keys: string[]): Promise<({ value: T; ageMs: number } | null)[]> {
  const r = getRedis();
  if (!r || keys.length === 0) return keys.map(() => null);
  const raws = await withTimeout(r.mget<(string | null)[]>(...keys));
  if (!Array.isArray(raws)) return keys.map(() => null);
  return keys.map((_, i) => {
    const raw = raws[i];
    if (typeof raw !== "string") return null;
    const env = decode<T>(raw);
    return env ? { value: env.v, ageMs: Date.now() - env.t } : null;
  });
}
