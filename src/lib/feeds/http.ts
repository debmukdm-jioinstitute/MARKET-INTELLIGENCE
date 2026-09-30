const DEFAULT_UA =
  process.env.FEED_USER_AGENT ??
  "MarketIntelligence/1.0 (+https://getmarketintelligence.vercel.app; feeds@market-intelligence.local)";

/** HTTP statuses worth retrying: rate limits, timeouts, transient server errors.
 *  401/403/404 are NOT retried — they signal auth, bot-walls or missing resources,
 *  which a retry will not fix. */
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export interface FeedFetchInit extends RequestInit {
  /** Per-attempt timeout in ms. Default 8000. */
  timeoutMs?: number;
  /** Total attempts (1 initial + retries). Default 3. */
  attempts?: number;
  /** Base backoff between attempts in ms (exponential, plus jitter). Default 800. */
  backoffBaseMs?: number;
  /** Max backoff between attempts in ms. Default 15000. */
  backoffMaxMs?: number;
  /** Cap for honoring a server-sent Retry-After header, in ms. Default 60000. */
  retryAfterCapMs?: number;
  /** Max concurrent in-flight requests per hostname (per serverless instance). Default 10. */
  maxConcurrentPerHost?: number;
  /** Custom retry predicate. Default: retry on 408/429/5xx. */
  shouldRetry?: (status: number) => boolean;
}

/* ------------------------------------------------------------------ */
/* Per-host concurrency limiter (per serverless instance). Prevents a   */
/* single fan-out (e.g. hundreds of Yahoo/Upstox calls) from looking    */
/* like a burst attack to the upstream host.                           */
/* ------------------------------------------------------------------ */
interface HostSlot {
  active: number;
  queue: Array<() => void>;
}
const hostSlots = new Map<string, HostSlot>();

function acquireSlot(host: string, max: number): Promise<() => void> {
  let slot = hostSlots.get(host);
  if (!slot) {
    slot = { active: 0, queue: [] };
    hostSlots.set(host, slot);
  }
  if (slot.active < max) {
    slot.active += 1;
    return Promise.resolve(() => releaseSlot(host));
  }
  return new Promise<() => void>((resolve) => {
    slot!.queue.push(() => {
      slot!.active += 1;
      resolve(() => releaseSlot(host));
    });
  });
}

function releaseSlot(host: string): void {
  const slot = hostSlots.get(host);
  if (!slot) return;
  const next = slot.queue.shift();
  if (next) {
    next();
  } else {
    slot.active -= 1;
    if (slot.active <= 0 && slot.queue.length === 0) hostSlots.delete(host);
  }
}

/** Parse a Retry-After header (seconds or HTTP date) into ms, capped. */
function parseRetryAfterMs(value: string | null, capMs: number): number | null {
  if (!value) return null;
  const v = value.trim();
  if (/^\d+$/.test(v)) return Math.min(Number(v) * 1000, capMs);
  const t = Date.parse(v);
  if (!Number.isNaN(t)) return Math.min(Math.max(t - Date.now(), 0), capMs);
  return null;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Shared fetch for all external feeds with resilience built in:
 * - retries with exponential backoff + jitter on 408/429/5xx and network errors
 * - honors the server's Retry-After header (capped)
 * - per-host concurrency limit so fan-outs don't look like attacks
 * - per-attempt timeout with a fresh AbortController each try
 *
 * Contract preserved: returns the last Response (callers check res.ok
 * themselves); throws only when every attempt fails with a network error.
 */
export async function feedFetch(
  url: string,
  init?: FeedFetchInit,
): Promise<Response> {
  const {
    timeoutMs = 8_000,
    attempts = 3,
    backoffBaseMs = 800,
    backoffMaxMs = 15_000,
    retryAfterCapMs = 60_000,
    maxConcurrentPerHost = 10,
    shouldRetry,
    ...fetchInit
  } = init ?? {};

  const maxAttempts = Math.max(1, Math.floor(attempts));
  const retryOn = shouldRetry ?? ((s: number) => RETRYABLE_STATUSES.has(s));

  let host = "unknown";
  try {
    host = new URL(url).hostname;
  } catch {
    /* keep "unknown" */
  }
  const release = await acquireSlot(host, Math.max(1, maxConcurrentPerHost));

  const callerSignal = fetchInit.signal as AbortSignal | null | undefined;
  const restInit = { ...fetchInit };
  delete restInit.signal;

  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const last = attempt === maxAttempts;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let onCallerAbort: (() => void) | undefined;
      if (callerSignal) {
        if (callerSignal.aborted) {
          clearTimeout(timer);
          throw new DOMException("Aborted by caller", "AbortError");
        }
        onCallerAbort = () => controller.abort();
        callerSignal.addEventListener("abort", onCallerAbort, { once: true });
      }
      const backoff = () =>
        Math.min(backoffMaxMs, backoffBaseMs * 2 ** (attempt - 1)) +
        Math.random() * 250;
      try {
        const res = await fetch(url, {
          ...restInit,
          signal: controller.signal,
          headers: {
            "User-Agent": DEFAULT_UA,
            Accept: "application/json, application/xml, text/xml, text/csv, */*",
            ...fetchInit.headers,
          },
        });
        if (!retryOn(res.status) || last) return res;
        const wait =
          parseRetryAfterMs(res.headers.get("retry-after"), retryAfterCapMs) ??
          backoff();
        try {
          await res.arrayBuffer();
        } catch {
          /* ignore — just draining the socket */
        }
        await sleep(wait);
      } catch (e) {
        if (callerSignal?.aborted || last) throw e;
        await sleep(backoff());
      } finally {
        clearTimeout(timer);
        if (callerSignal && onCallerAbort) {
          callerSignal.removeEventListener("abort", onCallerAbort);
        }
      }
    }
    throw new Error(`feedFetch exhausted attempts: ${url}`);
  } finally {
    release();
  }
}

export async function timed<T>(
  fn: () => Promise<T>,
): Promise<{ value?: T; error?: string; latencyMs: number }> {
  const start = Date.now();
  try {
    const value = await fn();
    return { value, latencyMs: Date.now() - start };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Unknown error",
      latencyMs: Date.now() - start,
    };
  }
}
