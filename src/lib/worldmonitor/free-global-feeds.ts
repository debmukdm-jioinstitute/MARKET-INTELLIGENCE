import { feedFetch, timed } from "@/lib/feeds/http";
import { parseRss } from "@/lib/feeds/rss";
import { fetchFredSeriesCsv } from "@/lib/feeds/sources/fred";
import { sortNewsByFreshness } from "@/lib/feeds/news-sort";
import type { NewsItem } from "@/lib/feeds/types";
import { getMarketShiftsCached } from "@/lib/feeds/what-changed/cache";
import { buildWorldIndices } from "@/lib/macro/build-world-indices";
const GLOBAL_RSS: { url: string; topic: string }[] = [
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", topic: "BBC World" },
  { url: "https://feeds.bbci.co.uk/news/business/rss.xml", topic: "BBC Business" },
  {
    url: "https://news.google.com/rss/search?q=geopolitics+sanctions+conflict&hl=en-US&gl=US&ceid=US:en",
    topic: "Geopolitics",
  },
  {
    url: "https://news.google.com/rss/search?q=global+stock+markets+central+bank&hl=en-US&gl=US&ceid=US:en",
    topic: "Global markets",
  },
];

async function fetchRss(url: string, topic: string): Promise<NewsItem[]> {
  try {
    const res = await feedFetch(url, { timeoutMs: 14_000 });
    if (!res.ok) return [];
    const items = parseRss(await res.text(), "yahoo", 10);
    return items.map((item) => ({
      ...item,
      id: `${topic}-${item.id}`,
      title: item.title.startsWith("[") ? item.title : `[${topic}] ${item.title}`,
    }));
  } catch {
    return [];
  }
}

const FRED_CSV_SERIES = [
  { id: "DGS10", name: "US 10Y Treasury", unit: "%" },
  { id: "DFF", name: "Fed funds effective", unit: "%" },
  { id: "VIXCLS", name: "VIX (FRED)", unit: "idx" },
  { id: "DTWEXBGS", name: "Trade-weighted USD", unit: "idx" },
] as const;

export type FreeGlobalFeedsPayload = {
  fetchedAt: string;
  news: NewsItem[];
  indices: Awaited<ReturnType<typeof buildWorldIndices>>;
  macro: { id: string; name: string; unit: string; latest: number | null; date: string | null }[];
  liquidity: Awaited<ReturnType<typeof getMarketShiftsCached>>;
  sources: { id: string; label: string; ok: boolean; detail?: string }[];
};

export async function buildFreeGlobalFeeds(): Promise<FreeGlobalFeedsPayload> {
  const fetchedAt = new Date().toISOString();

  const [rssBatches, indices, liquidity, ...fredResults] = await Promise.all([
    Promise.all(GLOBAL_RSS.map((f) => timed(() => fetchRss(f.url, f.topic)))),
    timed(() => buildWorldIndices()),
    timed(() => getMarketShiftsCached(false)),
    ...FRED_CSV_SERIES.map((s) => timed(() => fetchFredSeriesCsv(s.id))),
  ]);

  const news = sortNewsByFreshness(rssBatches.flatMap((b) => b.value ?? [])).slice(0, 40);

  const macro = FRED_CSV_SERIES.map((s, i) => {
    const points = fredResults[i]?.value ?? [];
    const last = points.at(-1);
    return {
      id: s.id,
      name: s.name,
      unit: s.unit,
      latest: last?.value ?? null,
      date: last?.date ?? null,
    };
  });

  const sources = [
    ...GLOBAL_RSS.map((f, i) => ({
      id: f.topic,
      label: f.topic,
      ok: (rssBatches[i]?.value?.length ?? 0) > 0,
      detail: rssBatches[i]?.error,
    })),
    {
      id: "yahoo_indices",
      label: "Yahoo Finance (world indices)",
      ok: (indices.value?.indices?.length ?? 0) > 0,
      detail: indices.error,
    },
    {
      id: "fred_csv",
      label: "FRED public CSV",
      ok: macro.some((m) => m.latest != null),
    },
    {
      id: "liquidity",
      label: "MI market shifts / liquidity",
      ok: (liquidity.value?.items?.length ?? 0) > 0,
      detail: liquidity.error,
    },
  ];

  return {
    fetchedAt,
    news,
    indices: indices.value ?? { fetchedAt, indices: [] },
    macro,
    liquidity: liquidity.value ?? { fetchedAt, slot: 0, items: [] },
    sources,
  };
}
