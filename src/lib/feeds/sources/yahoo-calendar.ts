import { feedFetch } from "@/lib/feeds/http";

/**
 * Yahoo Finance's earnings-calendar data (quoteSummary/calendarEvents) has required a
 * session cookie + crumb since 2024 — the crumb alone 401s. This gets one and caches it
 * in module scope so a batch run (many tickers in one request) only pays for it once.
 */

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "*/*",
};

type CrumbSession = { cookie: string; crumb: string; fetchedAt: number };

let cached: CrumbSession | null = null;
let inFlight: Promise<CrumbSession | null> | null = null;

const CRUMB_TTL_MS = 30 * 60_000;

function extractCookies(res: Response): string {
  const getSetCookie = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const raw = getSetCookie ? getSetCookie.call(res.headers) : [res.headers.get("set-cookie") ?? ""].filter(Boolean);
  return raw.map((c) => c.split(";")[0]).join("; ");
}

async function fetchCrumbSession(): Promise<CrumbSession | null> {
  const cookieRes = await feedFetch("https://fc.yahoo.com", { headers: BROWSER_HEADERS, timeoutMs: 8_000 });
  const cookie = extractCookies(cookieRes);
  if (!cookie) return null;

  const crumbRes = await feedFetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: { ...BROWSER_HEADERS, Cookie: cookie },
    timeoutMs: 8_000,
  });
  if (!crumbRes.ok) return null;
  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.includes("<html")) return null;

  return { cookie, crumb, fetchedAt: Date.now() };
}

async function getCrumbSession(): Promise<CrumbSession | null> {
  if (cached && Date.now() - cached.fetchedAt < CRUMB_TTL_MS) return cached;
  if (!inFlight) {
    inFlight = fetchCrumbSession().finally(() => {
      inFlight = null;
    });
  }
  const session = await inFlight;
  if (session) cached = session;
  return session;
}

export type YahooEarningsDate = { date: string; isEstimate: boolean };

type CalendarEventsResponse = {
  quoteSummary?: {
    result?: { calendarEvents?: { earnings?: { earningsDate?: { fmt?: string }[]; isEarningsDateEstimate?: boolean } } }[];
    error?: unknown;
  };
};

/** Next known earnings date for `${symbol}.NS`, or null if Yahoo has none on file. Throws on a hard fetch/auth failure so the caller can record why. */
export async function fetchYahooEarningsDate(symbol: string): Promise<YahooEarningsDate | null> {
  let session = await getCrumbSession();
  if (!session) throw new Error("Could not obtain a Yahoo Finance session (cookie/crumb)");

  const url = (crumb: string) =>
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(`${symbol}.NS`)}?modules=calendarEvents&crumb=${encodeURIComponent(crumb)}`;

  let res = await feedFetch(url(session.crumb), {
    headers: { ...BROWSER_HEADERS, Cookie: session.cookie },
    timeoutMs: 8_000,
  });

  // Crumb may have expired server-side even though our cache TTL hasn't — refresh once and retry.
  if (res.status === 401) {
    cached = null;
    session = await getCrumbSession();
    if (!session) throw new Error("Yahoo Finance session expired and could not be renewed");
    res = await feedFetch(url(session.crumb), {
      headers: { ...BROWSER_HEADERS, Cookie: session.cookie },
      timeoutMs: 8_000,
    });
  }

  if (!res.ok) throw new Error(`Yahoo Finance quoteSummary HTTP ${res.status}`);
  const json = (await res.json()) as CalendarEventsResponse;
  const earnings = json.quoteSummary?.result?.[0]?.calendarEvents?.earnings;
  const next = earnings?.earningsDate?.[0]?.fmt;
  if (!next) return null;

  return { date: next, isEstimate: earnings?.isEarningsDateEstimate ?? true };
}
