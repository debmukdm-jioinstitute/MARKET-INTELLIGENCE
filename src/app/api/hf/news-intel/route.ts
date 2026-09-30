/**
 * GET /api/hf/news-intel
 *
 * Combines live news from the feeds hub with HF AI enrichment:
 * 1. FinBERT sentiment on recent headlines (lexicon fallback if HF unavailable)
 * 2. BART TL;DR summarization of top stories (headline fallback if BART fails)
 * 3. Zero-shot category tagging
 */

import { classifyFinancialSentiment } from "@/lib/hf/finbert";
import { classifyNewsHeadlines } from "@/lib/hf/news-classifier";
import {
  aggregateLexiconHeadlines,
  buildFallbackTldr,
  finbertToNewsIntel,
} from "@/lib/hf/news-intel-aggregate";
import { summarizeItems } from "@/lib/hf/summarizer";
import { getFeedHubCached } from "@/lib/feeds/hub-cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
// Live AI inference must never be prerendered at build time — the HF client's
// internal cache still governs upstream calls.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hub = await getFeedHubCached();
    const news = (hub.news ?? []).filter((n) => n.title?.trim()).slice(0, 20);

    if (news.length === 0) {
      return NextResponse.json({
        sentiment: aggregateLexiconHeadlines([]),
        tldr: null,
        categories: [],
        analyzedCount: 0,
        asOf: new Date().toISOString(),
        noNews: true,
      });
    }

    const headlines = news.map((n) => n.title.trim()).slice(0, 10);
    const topHeadlines = headlines.slice(0, 5);
    const hasHfToken = Boolean(process.env.HF_TOKEN?.trim());

    let sentiment = aggregateLexiconHeadlines(topHeadlines);

    if (hasHfToken) {
      try {
        const finbert = await classifyFinancialSentiment(topHeadlines);
        if (finbert.length > 0) {
          sentiment = finbertToNewsIntel(finbert);
        }
      } catch {
        /* lexicon already set */
      }
    }

    const [classifiedResults, tldrResult] = await Promise.allSettled([
      hasHfToken ? classifyNewsHeadlines(headlines.slice(0, 6)) : Promise.resolve([]),
      hasHfToken ? summarizeItems(topHeadlines, 60) : Promise.resolve(""),
    ]);

    const categories =
      classifiedResults.status === "fulfilled"
        ? classifiedResults.value.map((c) => ({
            headline: c.headline.slice(0, 120),
            category: c.topCategory,
            confidence: Math.round(c.topScore * 100),
          }))
        : [];

    const tldr =
      tldrResult.status === "fulfilled" && tldrResult.value.trim()
        ? tldrResult.value.trim()
        : buildFallbackTldr(headlines, sentiment.label);

    return NextResponse.json({
      sentiment,
      tldr,
      categories,
      analyzedCount: headlines.length,
      asOf: hub.fetchedAt ?? new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
