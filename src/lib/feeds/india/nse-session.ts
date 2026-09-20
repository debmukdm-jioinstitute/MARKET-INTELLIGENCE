import { feedFetch } from "@/lib/feeds/http";

const NSE_HOME = "https://www.nseindia.com";

let cookieHeader: string | undefined;
let cookieAt = 0;
const COOKIE_TTL_MS = 5 * 60_000;

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

async function ensureNseSession() {
  if (cookieHeader && Date.now() - cookieAt < COOKIE_TTL_MS) return;
  const res = await feedFetch(NSE_HOME, { headers: BROWSER_HEADERS, timeoutMs: 20_000 });
  mergeSetCookie(res);
  if (!cookieHeader) {
    await feedFetch(`${NSE_HOME}/market-data/live-equity-market`, {
      headers: BROWSER_HEADERS,
      timeoutMs: 20_000,
    }).then(mergeSetCookie);
  }
}

export async function nseJson<T>(path: string): Promise<T> {
  await ensureNseSession();
  const res = await feedFetch(`${NSE_HOME}${path}`, {
    headers: {
      ...BROWSER_HEADERS,
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    timeoutMs: 20_000,
  });
  mergeSetCookie(res);
  if (!res.ok) throw new Error(`NSE ${path} HTTP ${res.status}`);
  return res.json() as Promise<T>;
}
