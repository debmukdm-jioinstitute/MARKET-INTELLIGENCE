import { feedFetch } from "@/lib/feeds/http";
import { parseRss } from "@/lib/feeds/rss";
import type { TrackedSubredditId } from "./types";
import type { RedditSearchHit } from "./reddit-http";

function googleNewsRssUrl(query: string) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
}

function subFromRedditUrl(link: string): TrackedSubredditId | null {
  const m = /reddit\.com\/r\/([^/]+)\/comments\/([a-z0-9]+)/i.exec(link);
  if (!m) return null;
  return `r/${m[1]}` as TrackedSubredditId;
}

function hitFromLink(title: string, link: string): RedditSearchHit | null {
  const m = /reddit\.com\/r\/[^/]+\/comments\/([a-z0-9]+)/i.exec(link);
  if (!m) return null;
  const cleanTitle = title.replace(/^(\[.*?\]\s*)+/, "").trim();
  return {
    id: m[1]!,
    title: cleanTitle || title,
    permalink: link.split("?")[0] ?? link,
    createdUtc: Math.floor(Date.now() / 1000),
    score: 0,
    numComments: 0,
  };
}

/**
 * When Reddit blocks direct API/RSS from the server, Google News still indexes public threads.
 * One query covers all tracked India subs — avoids 5× Reddit rate limits.
 */
export async function fetchRedditHitsViaGoogleNews(
  symbol: string,
  companyName: string,
  subs: TrackedSubredditId[],
  limit = 24,
): Promise<{ hits: RedditSearchHit[]; subredditById: Map<string, TrackedSubredditId> }> {
  const siteClause = subs.map((s) => `site:reddit.com/${s}`).join(" OR ");
  const q = `(${siteClause}) (${symbol} OR "${companyName}") when:7d`;
  const res = await feedFetch(googleNewsRssUrl(q), { timeoutMs: 14_000 });
  if (!res.ok) return { hits: [], subredditById: new Map() };

  const xml = await res.text();
  const items = parseRss(xml, "googlenews", limit);
  const hits: RedditSearchHit[] = [];
  const subredditById = new Map<string, TrackedSubredditId>();
  const seen = new Set<string>();

  for (const item of items) {
    if (!item.link.includes("reddit.com")) continue;
    const sub = subFromRedditUrl(item.link);
    if (!sub || !subs.includes(sub)) continue;
    const hit = hitFromLink(item.title, item.link);
    if (!hit || seen.has(hit.id)) continue;
    seen.add(hit.id);
    if (item.publishedAt) {
      hit.createdUtc = Math.floor(new Date(item.publishedAt).getTime() / 1000);
    }
    hits.push(hit);
    subredditById.set(hit.id, sub);
  }

  hits.sort((a, b) => b.createdUtc - a.createdUtc);
  return { hits: hits.slice(0, limit), subredditById };
}
