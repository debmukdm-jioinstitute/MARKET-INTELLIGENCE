import { afterEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, unknown>();
const state = vi.hoisted(() => ({ redis: false }));
vi.mock("@/lib/cache/redis", () => ({
  hasRedis: () => state.redis,
  cacheSetJson: async (k: string, v: unknown) => void store.set(k, v),
  cacheGetJson: async (k: string) => (store.has(k) ? { value: store.get(k), ageMs: 0 } : null),
}));

import { GET } from "../route";

afterEach(() => {
  state.redis = false;
  vi.unstubAllEnvs();
});

describe("GET /api/health/cache", () => {
  it("reports not configured without leaking anything when env vars are missing", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("KV_REST_API_URL", "");
    const res = await GET();
    expect(await res.json()).toEqual({ ok: false, configured: false, envPair: null });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("does a write/read round trip and names only the env pair", async () => {
    state.redis = true;
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "secret-token-value");
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, configured: true, envPair: "UPSTASH_REDIS_REST_*" });
    expect(JSON.stringify(body)).not.toContain("secret-token-value");
    expect(JSON.stringify(body)).not.toContain("example.upstash.io");
  });
});
