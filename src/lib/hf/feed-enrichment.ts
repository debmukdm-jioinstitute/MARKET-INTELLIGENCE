/**
 * FinBERT sentiment + zero-shot category batch enrichment for /intelligence feed headlines.
 * Scored once per batch of item ids (not per render), cached 30 min. A failure in either model
 * degrades that item to no badge — never blocks the feed item itself from rendering.
 */

import { classifyFinancialSentiment, type SentimentLabel } from "@/lib/hf/finbert";
import { classifyNewsHeadlines, type NewsCategory } from "@/lib/hf/news-classifier";

export type FeedItemEnrichment = { sentiment: SentimentLabel | null; category: NewsCategory | null };

const TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { at: number; data: Record<string, FeedItemEnrichment> }>();

async function batchSentiment(titles: string[]): Promise<(SentimentLabel | null)[]> {
  const out: (SentimentLabel | null)[] = [];
  for (let i = 0; i < titles.length; i += 5) {
    const batch = titles.slice(i, i + 5);
    try {
      const results = await classifyFinancialSentiment(batch);
      out.push(...batch.map((_, j) => results[j]?.label ?? null));
    } catch {
      out.push(...batch.map(() => null));
    }
  }
  return out;
}

export async function enrichFeedHeadlines(items: { id: string; title: string }[]): Promise<Record<string, FeedItemEnrichment>> {
  if (items.length === 0) return {};
  const capped = items.slice(0, 24);
  const key = capped.map((i) => i.id).join(",");
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  const titles = capped.map((i) => i.title);
  const [sentiments, categories] = await Promise.all([
    batchSentiment(titles),
    classifyNewsHeadlines(titles).catch(() => []),
  ]);

  const result: Record<string, FeedItemEnrichment> = {};
  capped.forEach((item, i) => {
    result[item.id] = {
      sentiment: sentiments[i] ?? null,
      category: categories[i]?.topCategory ?? null,
    };
  });
  cache.set(key, { at: Date.now(), data: result });
  return result;
}
