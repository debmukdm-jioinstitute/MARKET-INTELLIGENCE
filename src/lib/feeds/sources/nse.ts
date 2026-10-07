import { feedFetch } from "@/lib/feeds/http";
import { parseRss } from "@/lib/feeds/rss";
import type { NewsItem } from "@/lib/feeds/types";

// NSE's own RSS feeds (nsearchives .../RSS/LatestAnnouncements.xml and
// www.nseindia.com/content/RSS/LatestNews.xml) return HTTP 404 (verified 7 Oct 2026),
// so they were removed. Google News is the only working source here; the hub labels
// it as a fallback so the health page no longer reports "NSE RSS healthy".
const FEEDS = [
  "https://news.google.com/rss/search?q=NSE+India+corporate+filing+announcements&hl=en-IN&gl=IN&ceid=IN:en",
];

export async function fetchNseNews(): Promise<NewsItem[]> {
  for (const url of FEEDS) {
    try {
      const res = await feedFetch(url, {
        headers: {
          Referer: "https://www.nseindia.com/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeoutMs: 6000,
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = parseRss(xml, "nse", 10);
      if (items.length) return items;
    } catch {
      /* try next */
    }
  }
  return [];
}
