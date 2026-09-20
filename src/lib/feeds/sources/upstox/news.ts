import { feedFetch } from "@/lib/feeds/http";
import { UPSTOX_BASE_URL, upstoxHeaders } from "@/lib/feeds/sources/upstox/client";
import type { NewsItem } from "@/lib/feeds/types";

type UpstoxNewsRow = {
  heading: string;
  article_link: string;
  published_time: number;
};

type UpstoxNewsResponse = {
  status: string;
  data?: Record<string, UpstoxNewsRow[]>;
};

/** Stock/market news for a set of instrument keys — merged into the feed hub's news stream. */
export async function fetchUpstoxNews(instrumentKeys: string[]): Promise<NewsItem[]> {
  const headers = upstoxHeaders();
  if (!headers || instrumentKeys.length === 0) return [];

  const url = `${UPSTOX_BASE_URL}/v2/news?category=instrument_keys&instrument_keys=${encodeURIComponent(
    instrumentKeys.join(","),
  )}`;
  const res = await feedFetch(url, { headers });
  if (!res.ok) throw new Error(`Upstox news HTTP ${res.status}`);
  const json = (await res.json()) as UpstoxNewsResponse;
  if (json.status !== "success" || !json.data) return [];

  const out: NewsItem[] = [];
  for (const [instrumentKey, rows] of Object.entries(json.data)) {
    rows.forEach((row, i) => {
      out.push({
        id: `upstox-${instrumentKey}-${i}-${row.published_time}`,
        source: "upstox",
        title: row.heading,
        link: row.article_link,
        publishedAt: new Date(row.published_time).toISOString(),
      });
    });
  }
  return out;
}
