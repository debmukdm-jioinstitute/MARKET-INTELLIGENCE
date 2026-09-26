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

export function filterRegulatoryExchangeNews(items: NewsItem[]): NewsItem[] {
  const allowed = new Set(REGULATORY_EXCHANGE_SOURCES);
  return items.filter((n) => allowed.has(n.source));
}

export function formatNewsPublishedAt(raw: string | undefined): string {
  const ms = newsPublishedAtMs(raw);
  if (!ms) return raw?.trim() ?? "";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(ms);
}
