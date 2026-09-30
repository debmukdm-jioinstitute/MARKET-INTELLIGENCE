/**
 * Shared Hugging Face Inference API client.
 *
 * • Reads HF_TOKEN from env (optional — HF free-tier works without a token for most models,
 *   but adding one raises rate-limits significantly).
 * • All calls go through the server; tokens are never exposed to the browser.
 * • Built-in in-memory TTL cache (default 10 min) so repeated page loads are instant.
 * • Retry with exponential back-off on 503 (model loading) responses.
 */

// HF retired api-inference.huggingface.co in favor of the "Inference Providers" router; the
// hf-inference provider keeps the same classic pipeline request/response shape this file already
// speaks, just under a new host + path prefix. A Bearer token is now required (no more anonymous
// free tier), which is why every call here silently failed even with a valid HF_TOKEN unset.
const HF_INFERENCE_BASE = "https://router.huggingface.co/hf-inference/models";

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Simple in-process cache entry */
type CacheEntry<T> = { value: T; expiresAt: number };

// Module-level cache — survives across requests in the same Node.js process.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CACHE = new Map<string, CacheEntry<any>>();

function cacheGet<T>(key: string): T | undefined {
  const entry = CACHE.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    CACHE.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
  CACHE.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export class HfApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HfApiError";
  }
}

/**
 * Call a HuggingFace Inference endpoint.
 *
 * @param model   e.g. "ProsusAI/finbert"
 * @param inputs  The payload passed to the model (string or object).
 * @param opts    Additional fetch options.
 */
export async function hfInfer<TIn, TOut>(
  model: string,
  inputs: TIn,
  opts: { ttlMs?: number; cacheKey?: string; maxRetries?: number } = {},
): Promise<TOut> {
  const { ttlMs = DEFAULT_TTL_MS, cacheKey, maxRetries = 4 } = opts;
  const key = cacheKey ?? `${model}::${JSON.stringify(inputs)}`;

  const cached = cacheGet<TOut>(key);
  if (cached !== undefined) return cached;

  const token = process.env.HF_TOKEN;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential back-off: 2s, 4s, 8s …  (model may still be loading)
      await new Promise((r) => setTimeout(r, Math.min(2 ** attempt * 1000, 16_000)));
    }

    const res = await fetch(`${HF_INFERENCE_BASE}/${model}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ inputs }),
    });

    if (res.status === 503) {
      // Model is still loading — retry
      lastError = new HfApiError(503, `Model ${model} is loading (attempt ${attempt + 1})`);
      continue;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new HfApiError(res.status, `HF API ${res.status} for ${model}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as TOut;
    cacheSet(key, data, ttlMs);
    return data;
  }

  throw lastError ?? new HfApiError(503, `Model ${model} failed to load after ${maxRetries} retries`);
}

/** Convenience: call HF and return the raw JSON, bypassing cache. */
export async function hfInferNoCache<TIn, TOut>(model: string, inputs: TIn): Promise<TOut> {
  return hfInfer<TIn, TOut>(model, inputs, { ttlMs: 0, cacheKey: `nocache::${model}::${Date.now()}` });
}
