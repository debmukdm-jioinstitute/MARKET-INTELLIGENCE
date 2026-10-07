import { feedFetch } from "@/lib/feeds/http";
import { parseRss } from "@/lib/feeds/rss";
import type { NewsItem } from "@/lib/feeds/types";

// CorpFiling.xml (www.bseindia.com/xml-data/corpfiling/CorpFiling.xml) returns 404
// (verified 7 Oct 2026) and was removed. FEEDS[0] is the primary BSE feed; anything
// after it is a fallback, reported as such by fetchBseNewsWithOrigin().
const FEEDS = [
  "https://www.bseindia.com/data/xml/notices.xml",
  "https://news.google.com/rss/search?q=BSE+India+stock+exchange+announcements&hl=en-IN&gl=IN&ceid=IN:en",
];

export type FeedOrigin = "primary" | "fallback" | "none";

export async function fetchBseNews(): Promise<NewsItem[]> {
  return (await fetchBseNewsWithOrigin()).items;
}

/** Same as fetchBseNews, plus which URL actually served the items (for honest health). */
export async function fetchBseNewsWithOrigin(): Promise<{ items: NewsItem[]; via: FeedOrigin }> {
  for (const [i, url] of FEEDS.entries()) {
    try {
      const res = await feedFetch(url, {
        headers: {
          Referer: "https://www.bseindia.com/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeoutMs: 6000,
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = parseRss(xml, "bse", 10);
      if (items.length) return { items, via: i === 0 ? "primary" : "fallback" };
    } catch {
      /* try next */
    }
  }
  return { items: [], via: "none" };
}
