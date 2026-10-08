export type ImpactLevel = "HIGH" | "MEDIUM" | "LOW";
export type EventStatus = "reported" | "today" | "upcoming";
export type EventRegion = "IND" | "USA" | "GLOBAL";

export interface CalendarEvent {
  id: string;
  metricId: string;
  date: string; // Formatted IST for display: "Oct 09, 10:00"
  isoDate: string; // ISO 8601 UTC
  country: string; // "IND", "USA", "EUR", "GBP", "JPY", etc.
  region: EventRegion;
  event: string;
  impact: ImpactLevel;
  actual: string; // Print or "—"
  forecast: string;
  previous: string;
  status: EventStatus;
  source: string;
  description: string;
  sourceUrl?: string;
}

export interface EconomicCalendarPayload {
  events: CalendarEvent[];
  fetchedAt: string;
  nextRefreshAt: string;
  counts: {
    total: number;
    india: number;
    usa: number;
    global: number;
    upcoming: number;
    reported: number;
  };
}

// Live source: the free FairEconomy / Forex Factory weekly calendar JSON. It carries consensus
// forecast and previous print but no "actual", so actual stays "—". Nothing here is hard-coded.
const FEED_URLS = [
  "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
  "https://nfs.faireconomy.media/ff_calendar_nextweek.json",
];
const SOURCE = "Forex Factory / FairEconomy weekly calendar";
const SOURCE_URL = "https://www.forexfactory.com/calendar";

// In-memory cache with 5-minute TTL (the upstream file updates a few times a day)
let cachedPayload: { at: number; data: EconomicCalendarPayload } | null = null;
const CACHE_TTL_MS = 5 * 60_000;

function formatIst(isoUtc: string): string {
  try {
    const d = new Date(isoUtc);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return isoUtc;
  }
}

type FeedRow = { title?: string; country?: string; date?: string; impact?: string; forecast?: string; previous?: string };

const COUNTRY: Record<string, { country: string; region: EventRegion }> = {
  USD: { country: "USA", region: "USA" },
  EUR: { country: "EUR", region: "GLOBAL" },
  GBP: { country: "GBP", region: "GLOBAL" },
  JPY: { country: "JPY", region: "GLOBAL" },
  CNY: { country: "CNY", region: "GLOBAL" },
  AUD: { country: "AUD", region: "GLOBAL" },
  CAD: { country: "CAD", region: "GLOBAL" },
  CHF: { country: "CHF", region: "GLOBAL" },
  NZD: { country: "NZD", region: "GLOBAL" },
  ALL: { country: "ALL", region: "GLOBAL" },
};

/** Glossary id used by the ⓘ popover; falls back to the generic indicator entry. */
function metricIdFor(title: string): string {
  const t = title.toLowerCase();
  if (/cpi|inflation|pce|ppi|price/.test(t)) return "cpi";
  if (/gdp/.test(t)) return "gdp";
  if (/pmi|ism|sentiment|confidence/.test(t)) return "pmi";
  if (/employment|payroll|jobless|unemployment|claims|jobs/.test(t)) return "labor";
  if (/rate|fomc|ecb|boe|boj|mpc/.test(t)) return "repo";
  return "cpi";
}

const IMPACT: Record<string, ImpactLevel> = { high: "HIGH", medium: "MEDIUM", low: "LOW" };

/** Pure mapper (exported for tests): feed rows to calendar events, relative to `nowMs`. */
export function mapFeedRows(rows: FeedRow[], nowMs: number): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const r of rows) {
    const impact = IMPACT[(r.impact ?? "").toLowerCase()];
    const c = COUNTRY[(r.country ?? "").toUpperCase()];
    const t = r.date ? new Date(r.date).getTime() : NaN;
    if (!impact || !c || !r.title || !Number.isFinite(t)) continue; // drops holidays and malformed rows
    const iso = new Date(t).toISOString();
    const diffHours = (t - nowMs) / 3_600_000;
    const status: EventStatus = diffHours < -2 ? "reported" : diffHours <= 12 ? "today" : "upcoming";
    out.push({
      id: `ff-${iso}-${c.country}-${r.title}`.replace(/[^a-zA-Z0-9-]+/g, "-").toLowerCase(),
      metricId: metricIdFor(r.title),
      date: formatIst(iso),
      isoDate: iso,
      country: c.country,
      region: c.region,
      event: r.title,
      impact,
      actual: "—",
      forecast: r.forecast?.trim() || "—",
      previous: r.previous?.trim() || "—",
      status,
      source: SOURCE,
      description: `${r.title} (${c.country}).`,
      sourceUrl: SOURCE_URL,
    });
  }
  return out.sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime());
}

async function fetchFeed(url: string): Promise<FeedRow[]> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8_000), next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = (await res.json()) as unknown;
    return Array.isArray(json) ? (json as FeedRow[]) : [];
  } catch {
    return [];
  }
}

export function buildPayload(events: CalendarEvent[], nowMs: number): EconomicCalendarPayload {
  return {
    events,
    fetchedAt: new Date(nowMs).toISOString(),
    nextRefreshAt: new Date(nowMs + CACHE_TTL_MS).toISOString(),
    counts: {
      total: events.length,
      india: events.filter((e) => e.region === "IND").length,
      usa: events.filter((e) => e.region === "USA").length,
      global: events.filter((e) => e.region === "GLOBAL").length,
      upcoming: events.filter((e) => e.status !== "reported").length,
      reported: events.filter((e) => e.status === "reported").length,
    },
  };
}

/** Live economic calendar for this week and next. Empty (never invented) when the feed is unreachable. */
export async function getEconomicCalendar(options?: {
  region?: EventRegion | "all";
  impact?: ImpactLevel | "all";
}): Promise<EconomicCalendarPayload> {
  const nowMs = Date.now();
  if (cachedPayload && nowMs - cachedPayload.at < CACHE_TTL_MS) return filterCalendar(cachedPayload.data, options);

  const rows = (await Promise.all(FEED_URLS.map(fetchFeed))).flat();
  const payload = buildPayload(mapFeedRows(rows, nowMs), nowMs);
  if (payload.events.length) cachedPayload = { at: nowMs, data: payload };
  return filterCalendar(payload, options);
}

function filterCalendar(
  payload: EconomicCalendarPayload,
  options?: { region?: EventRegion | "all"; impact?: ImpactLevel | "all" }
): EconomicCalendarPayload {
  let filtered = payload.events;

  if (options?.region && options.region !== "all") {
    filtered = filtered.filter((e) => e.region === options.region);
  }

  if (options?.impact && options.impact !== "all") {
    filtered = filtered.filter((e) => e.impact === options.impact);
  }

  return {
    ...payload,
    events: filtered,
  };
}
