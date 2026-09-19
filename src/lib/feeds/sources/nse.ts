import { feedFetch } from "@/lib/feeds/http";
import { parseRss } from "@/lib/feeds/rss";
import type { NewsItem } from "@/lib/feeds/types";

const FEEDS = [
  "https://nsearchives.nseindia.com/content/RSS/LatestAnnouncements.xml",
  "https://www.nseindia.com/content/RSS/LatestNews.xml",
];

export async function fetchNseNews(): Promise<NewsItem[]> {
  for (const url of FEEDS) {
    try {
      const res = await feedFetch(url, {
        headers: { Referer: "https://www.nseindia.com/" },
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
