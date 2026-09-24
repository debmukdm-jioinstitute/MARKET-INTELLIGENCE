import { feedFetch } from "@/lib/feeds/http";
import { parseRss } from "@/lib/feeds/rss";
import type { NewsItem } from "@/lib/feeds/types";

const FEEDS = [
  "https://www.bseindia.com/data/xml/notices.xml",
  "https://www.bseindia.com/xml-data/corpfiling/CorpFiling.xml",
  "https://news.google.com/rss/search?q=BSE+India+stock+exchange+announcements&hl=en-IN&gl=IN&ceid=IN:en",
];

export async function fetchBseNews(): Promise<NewsItem[]> {
  for (const url of FEEDS) {
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
      if (items.length) return items;
    } catch {
      /* try next */
    }
  }
  return [];
}
