import { feedFetch } from "@/lib/feeds/http";

const TRENDS_ORIGIN = "https://trends.google.com";

let cookieHeader: string | undefined;
let cookieAt = 0;
const COOKIE_TTL_MS = 5 * 60_000;

/** Google Trends blocks the default feedFetch bot UA (429); use a browser fingerprint + cookies. */
export const GOOGLE_TRENDS_BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    process.env.GOOGLE_TRENDS_USER_AGENT ??
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: `${TRENDS_ORIGIN}/trends/explore`,
};

function mergeSetCookie(res: Response) {
  const raw = res.headers.getSetCookie?.() ?? [];
  if (raw.length) {
    cookieHeader = raw.map((c) => c.split(";")[0]).join("; ");
    cookieAt = Date.now();
    return;
  }
  const single = res.headers.get("set-cookie");
  if (single) {
    cookieHeader = single.split(";")[0];
    cookieAt = Date.now();
  }
}

export async function ensureGoogleTrendsSession(): Promise<void> {
  if (cookieHeader && Date.now() - cookieAt < COOKIE_TTL_MS) return;
  const res = await feedFetch(`${TRENDS_ORIGIN}/trends/`, {
    headers: GOOGLE_TRENDS_BROWSER_HEADERS,
    timeoutMs: 20_000,
  });
  mergeSetCookie(res);
}

export async function googleTrendsFetch(url: string, init?: RequestInit & { timeoutMs?: number }): Promise<Response> {
  await ensureGoogleTrendsSession();
  return feedFetch(url, {
    ...init,
    headers: {
      ...GOOGLE_TRENDS_BROWSER_HEADERS,
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...init?.headers,
    },
  });
}
