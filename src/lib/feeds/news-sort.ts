import type { FeedSourceId, NewsItem } from "@/lib/feeds/types";

/** Parse RSS/Atom date strings to epoch ms; missing/unparseable → 0 (sorts last). */
export function newsPublishedAtMs(raw: string | undefined): number {
  if (!raw?.trim()) return 0;
  const ms = Date.parse(raw.trim());
  return Number.isFinite(ms) ? ms : 0;
}

/** Normalize to ISO UTC when parseable; otherwise keep original string. */
export function normalizeNewsPublishedAt(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const trimmed = raw.trim();
  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) return trimmed;
  return new Date(ms).toISOString();
}

/** Latest first (date + time). Stable tie-break on id. */
export function sortNewsByFreshness(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => {
    const diff = newsPublishedAtMs(b.publishedAt) - newsPublishedAtMs(a.publishedAt);
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });
}

export const REGULATORY_EXCHANGE_SOURCES: FeedSourceId[] = ["nse", "bse", "rbi"];

export const OPEN_COMMUNITY_NEWS_SOURCES: FeedSourceId[] = [
  "reddit",
  "livemint",
  "moneycontrol",
  "googlenews",
  "busstd",
  "rsswire",
];

export function filterRegulatoryExchangeNews(items: NewsItem[]): NewsItem[] {
  const allowed = new Set(REGULATORY_EXCHANGE_SOURCES);
  return items.filter((n) => allowed.has(n.source));
}

export function filterOpenCommunityNews(items: NewsItem[]): NewsItem[] {
  const allowed = new Set(OPEN_COMMUNITY_NEWS_SOURCES);
  return items.filter((n) => allowed.has(n.source));
}

export function formatNewsPublishedAt(raw: string | undefined): string {
  const ms = newsPublishedAtMs(raw);
  if (!ms) return raw?.trim() ?? "";
  const d = new Date(ms);
  const datePart = d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
  const timePart = d
    .toLocaleString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    })
    .replace(/\s/g, " ")
    .toLowerCase();
  return `${datePart}, ${timePart} IST`;
}
