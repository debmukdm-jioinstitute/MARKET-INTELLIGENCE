/**
 * GET /api/hf/news-intel
 *
 * Combines live news from the feeds hub with HF AI enrichment:
 * 1. FinBERT sentiment on recent headlines (lexicon fallback if HF unavailable)
 * 2. Transparent sentiment drivers attributing market impact (+ve, -ve, neutral) to specific news
 * 3. Clickable TL;DR headlines linking directly to authentic sources
 * 4. BART TL;DR summarization of top stories
 * 5. Zero-shot category tagging
 */

import { classifyFinancialSentiment, type SentimentLabel } from "@/lib/hf/finbert";
import { classifyNewsHeadlines } from "@/lib/hf/news-classifier";
import { scoreHeadlineLexicon } from "@/lib/feeds/sentiment-lexicon";
import {
  aggregateLexiconHeadlines,
  buildFallbackTldr,
  buildMarketSentimentRationale,
  explainHeadlineSentiment,
  finbertToNewsIntel,
  formatNewsSource,
  type NewsIntelItem,
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
    const rawNews = hub.news ?? [];

    // Prioritize Indian financial news sources: livemint, moneycontrol, rbi, nse, bse, busstd, googlenews
    const indianNews = rawNews.filter((n) =>
      ["livemint", "moneycontrol", "rbi", "nse", "bse", "busstd", "googlenews"].includes(n.source)
    );
    const otherNews = rawNews.filter(
      (n) => !["livemint", "moneycontrol", "rbi", "nse", "bse", "busstd", "googlenews"].includes(n.source)
    );
    const candidateNews = [...indianNews, ...otherNews].filter((n) => n.title?.trim() && n.link?.startsWith("http"));

    // Deduplicate by title
    const seenTitles = new Set<string>();
    const news: typeof candidateNews = [];
    for (const item of candidateNews) {
      const norm = item.title.trim().toLowerCase();
      if (seenTitles.has(norm)) continue;
      seenTitles.add(norm);
      news.push(item);
      if (news.length >= 10) break;
    }

    if (news.length === 0) {
      const emptySentiment = aggregateLexiconHeadlines([]);
      return NextResponse.json({
        sentiment: {
          ...emptySentiment,
          rationale: "No active news items available in the intelligence feed yet.",
          drivers: { positive: [], negative: [], neutral: [] },
        },
        tldr: null,
        items: [],
        categories: [],
        analyzedCount: 0,
        asOf: new Date().toISOString(),
        noNews: true,
      });
    }

    const headlines = news.map((n) => n.title.trim());
    const topHeadlines = headlines.slice(0, 6);
    const hasHfToken = Boolean(process.env.HF_TOKEN?.trim());

    let rawSentiment = aggregateLexiconHeadlines(topHeadlines);
    const itemSentiments: { label: SentimentLabel; score: number }[] = [];

    if (hasHfToken) {
      try {
        const finbert = await classifyFinancialSentiment(topHeadlines);
        if (finbert.length > 0) {
          rawSentiment = finbertToNewsIntel(finbert);
          for (const f of finbert) {
            itemSentiments.push({ label: f.label, score: f.score });
          }
        }
      } catch {
        /* lexicon already set */
      }
    }

    // Map each news item with individual sentiment, valid URL, and reason
    const items: NewsIntelItem[] = news.map((n, idx) => {
      let label: SentimentLabel = "neutral";
      let score = 0.8;
      if (itemSentiments[idx]) {
        label = itemSentiments[idx].label;
        score = itemSentiments[idx].score;
      } else {
        const scored = scoreHeadlineLexicon(n.title);
        label = scored.label;
        score = Math.min(0.6 + Math.abs(scored.score) * 0.15, 0.95);
      }

      const impact = label === "positive" ? "+ve" : label === "negative" ? "-ve" : "neutral";
      const reason = explainHeadlineSentiment(n.title, label, n.source);
      const sourceLabel = formatNewsSource(n.source);

      return {
        id: n.id || `news-${idx}`,
        title: n.title.trim(),
        url: n.link,
        source: n.source,
        sourceLabel,
        publishedAt: n.publishedAt,
        sentiment: {
          label,
          score,
          impact,
          reason,
        },
      };
    });

    const { rationale, drivers } = buildMarketSentimentRationale(rawSentiment, items);
    const sentiment = {
      ...rawSentiment,
      rationale,
      drivers,
    };

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
      items,
      categories,
      analyzedCount: items.length,
      asOf: hub.fetchedAt ?? new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
