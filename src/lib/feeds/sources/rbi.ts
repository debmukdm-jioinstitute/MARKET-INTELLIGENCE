import { feedFetch } from "@/lib/feeds/http";
import { parseRss } from "@/lib/feeds/rss";
import type { NewsItem } from "@/lib/feeds/types";

const FEEDS = [
  "https://www.rbi.org.in/pressreleases_rss.xml",
  "https://www.rbi.org.in/notifications_rss.xml",
];

export async function fetchRbiNews(): Promise<NewsItem[]> {
  for (const url of FEEDS) {
    try {
      const res = await feedFetch(url);
      if (!res.ok) continue;
      const xml = await res.text();
      const items = parseRss(xml, "rbi", 10);
      if (items.length) return items;
    } catch {
      /* try next */
    }
  }
  return [];
}
