/**
 * GET /api/hf/news-intel
 *
 * Combines live news from the feeds hub with HF AI enrichment:
 * 1. FinBERT sentiment on recent headlines
 * 2. BART TL;DR summarization of top stories
 * 3. Zero-shot category tagging
 *
 * Returns a structured intelligence payload ready for client consumption.
 * Results are cached server-side for 10 minutes via the HF client cache.
 */

import { aggregateSentimentScore, classifyFinancialSentiment } from "@/lib/hf/finbert";
import { classifyNewsHeadlines } from "@/lib/hf/news-classifier";
import { summarizeItems } from "@/lib/hf/summarizer";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 600; // 10 minutes ISR cache

interface NewsItem {
  title: string;
  source: string;
  publishedAt?: string;
  link?: string;
  summary?: string;
}

// We import from the feeds hub but only need the news slice
async function getRecentNews(): Promise<NewsItem[]> {
  try {
    // Fetch from our own feeds API (avoids circular imports)
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/feeds`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { news?: NewsItem[] };
    return (data.news ?? []).slice(0, 20);
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const news = await getRecentNews();

    if (news.length === 0) {
      return NextResponse.json({
        sentiment: { score: 0, label: "neutral", confidence: 0, breakdown: { positive: 0, negative: 0, neutral: 0 } },
        tldr: null,
        categories: [],
        analyzedCount: 0,
        asOf: new Date().toISOString(),
      });
    }

    const headlines = news.map((n) => n.title).filter(Boolean).slice(0, 10);
    const topHeadlines = headlines.slice(0, 5);

    // Run FinBERT + BART + Zero-shot in parallel
    const [sentimentResults, classifiedResults, tldr] = await Promise.allSettled([
      classifyFinancialSentiment(topHeadlines),
      classifyNewsHeadlines(headlines.slice(0, 6)),
      summarizeItems(
        topHeadlines,
        60,
      ),
    ]);

    const sentiments = sentimentResults.status === "fulfilled" ? sentimentResults.value : [];
    const aggSentiment = aggregateSentimentScore(sentiments);

    const categories =
      classifiedResults.status === "fulfilled"
        ? classifiedResults.value.map((c) => ({
            headline: c.headline.slice(0, 120),
            category: c.topCategory,
            confidence: Math.round(c.topScore * 100),
          }))
        : [];

    const summary = tldr.status === "fulfilled" ? tldr.value : null;

    return NextResponse.json({
      sentiment: aggSentiment,
      tldr: summary,
      categories,
      analyzedCount: headlines.length,
      asOf: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
