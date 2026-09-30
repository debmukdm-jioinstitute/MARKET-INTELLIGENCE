/**
 * Zero-shot news topic classifier — facebook/bart-large-mnli
 *
 * Classifies financial news headlines into pre-defined market categories
 * without any fine-tuning. Uses BART's NLI head via HF zero-shot pipeline.
 *
 * Model: facebook/bart-large-mnli (Apache-2.0).
 * Use-cases: auto-tagging news, routing headlines to the right intelligence panel.
 */

import { hfInfer } from "@/lib/hf/client";

export const NEWS_CATEGORIES = [
  "monetary-policy",
  "earnings",
  "merger-acquisition",
  "ipo",
  "regulatory",
  "macro-economy",
  "commodity",
  "currency",
  "geopolitics",
  "corporate-governance",
  "credit-rating",
  "mutual-fund",
  "technical-analysis",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

interface ZeroShotResponse {
  sequence: string;
  labels: string[];
  scores: number[];
}

const MODEL = "facebook/bart-large-mnli";
const TTL_MS = 30 * 60 * 1000; // 30 min

export interface ClassifiedNews {
  headline: string;
  topCategory: NewsCategory;
  topScore: number;
  allCategories: { category: NewsCategory; score: number }[];
}

/**
 * Classify a news headline or short snippet into market categories.
 */
export async function classifyNewsHeadline(headline: string): Promise<ClassifiedNews> {
  const clipped = headline.slice(0, 500);
  const cacheKey = `zs-news::${clipped}`;

  const result = await hfInfer<
    { inputs: string; parameters: { candidate_labels: string[]; multi_label: boolean } },
    ZeroShotResponse
  >(
    MODEL,
    {
      inputs: clipped,
      parameters: {
        candidate_labels: NEWS_CATEGORIES as unknown as string[],
        multi_label: false,
      },
    },
    { ttlMs: TTL_MS, cacheKey },
  );

  const categorized = result.labels.map((label, i) => ({
    category: label as NewsCategory,
    score: result.scores[i] ?? 0,
  }));

  return {
    headline: result.sequence,
    topCategory: categorized[0]!.category,
    topScore: categorized[0]!.score,
    allCategories: categorized,
  };
}

/**
 * Classify multiple headlines in batch.
 * Batched to avoid hitting rate-limits on the free tier.
 */
export async function classifyNewsHeadlines(headlines: string[]): Promise<ClassifiedNews[]> {
  const results: ClassifiedNews[] = [];
  // Process in batches of 3 with a small delay
  for (let i = 0; i < headlines.length; i += 3) {
    const batch = headlines.slice(i, i + 3);
    const batchResults = await Promise.all(batch.map(classifyNewsHeadline));
    results.push(...batchResults);
    if (i + 3 < headlines.length) await new Promise((r) => setTimeout(r, 500));
  }
  return results;
}
