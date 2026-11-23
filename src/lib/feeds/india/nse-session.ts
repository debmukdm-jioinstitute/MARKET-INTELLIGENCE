import { mergeCookiesFromResponse, looksLikeHtmlText } from "@/lib/feeds/cookie-jar";
import { feedFetch } from "@/lib/feeds/http";

const NSE_HOME = "https://www.nseindia.com";

let cookieHeader: string | undefined;
let cookieAt = 0;
const COOKIE_TTL_MS = 5 * 60_000;
const WARMUP_TIMEOUT_MS = 8_000;

// NSE's bot wall drops any non-browser User-Agent outright (verified: our default
// feedFetch UA gets connection-refused, a real Chrome UA gets 200) — override it here.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: `${NSE_HOME}/`,
  Origin: NSE_HOME,
};

function rememberCookies(res: Response) {
  const next = mergeCookiesFromResponse(cookieHeader, res, { stripPoison: true });
  if (next) {
    cookieHeader = next;
    cookieAt = Date.now();
  }
}

function clearSession() {
  cookieHeader = undefined;
  cookieAt = 0;
}

/**
 * Homepage warmup is best-effort. GitHub-hosted runners often hang on
 * www.nseindia.com HTML (20s × 3 → AbortError) even though `/api/*` still
 * answers. Never throw: callers try the API with whatever cookies we have.
 */
async function tryWarmSession(signal?: AbortSignal): Promise<void> {
  if (cookieHeader && Date.now() - cookieAt < COOKIE_TTL_MS) return;
  if (signal?.aborted) return;
  try {
    const res = await feedFetch(NSE_HOME, {
      headers: { ...BROWSER_HEADERS, Accept: "text/html,application/xhtml+xml,*/*" },
      timeoutMs: WARMUP_TIMEOUT_MS,
      attempts: 1,
      signal,
    });
    rememberCookies(res);
  } catch {
    /* ignore — API call may still succeed without cookies */
  }
}

/** Per-call budget. Defaults keep the old cron-friendly behaviour (20 s x 3 attempts). */
export type NseFetchOpts = { timeoutMs?: number; attempts?: number; signal?: AbortSignal };

function isAuthWall(status: number): boolean {
  return status === 401 || status === 403;
}

export async function nseJson<T>(path: string, opts: NseFetchOpts = {}): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const attempts = Math.max(1, opts.attempts ?? 3);
  let lastErr: unknown;

  for (let i = 1; i <= attempts; i++) {
    if (opts.signal?.aborted) {
      throw lastErr instanceof Error ? lastErr : new DOMException("Aborted by caller", "AbortError");
    }
    try {
      const res = await feedFetch(`${NSE_HOME}${path}`, {
        headers: {
          ...BROWSER_HEADERS,
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        timeoutMs,
        attempts: 1,
        signal: opts.signal,
      });
      if (isAuthWall(res.status)) {
        // Don't keep 403 cookies — they can be Akamai challenge crumbs that hang the next call.
        clearSession();
        await tryWarmSession(opts.signal);
        lastErr = new Error(`NSE ${path} HTTP ${res.status}`);
        continue;
      }
      rememberCookies(res);
      if (!res.ok) throw new Error(`NSE ${path} HTTP ${res.status}`);
      const text = await res.text();
      if (looksLikeHtmlText(text)) {
        clearSession();
        await tryWarmSession(opts.signal);
        lastErr = new Error(`NSE ${path} returned HTML instead of JSON`);
        continue;
      }
      return JSON.parse(text) as T;
    } catch (e) {
      lastErr = e;
      if (opts.signal?.aborted) throw e;
      clearSession();
      await tryWarmSession(opts.signal);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

const XML_HEADERS = {
  ...BROWSER_HEADERS,
  Accept: "application/xml,text/xml,*/*",
};

/**
 * Text fetch for NSE archive files (XBRL). Reuses the session cookie and
 * retries like nseJson — the old single-attempt bare fetch dropped filings
 * that a second attempt would have delivered.
 */
export async function nseText(url: string, opts: NseFetchOpts = {}): Promise<string | null> {
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const attempts = Math.max(1, opts.attempts ?? 2);
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await feedFetch(url, {
        headers: {
          ...XML_HEADERS,
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        timeoutMs,
        attempts: 1,
        signal: opts.signal,
      });
      if (isAuthWall(res.status)) {
        clearSession();
        await tryWarmSession(opts.signal);
        continue;
      }
      rememberCookies(res);
      if (!res.ok) return null;
      return await res.text();
    } catch {
      if (opts.signal?.aborted) return null;
      clearSession();
      await tryWarmSession(opts.signal);
    }
  }
  return null;
}

/** Test hook — do not use in production code. */
export function __resetNseSessionForTests() {
  clearSession();
}
