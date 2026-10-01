/**
 * GET /api/hf/news-intel
 *
 * Multi-Pillar AI Market Intelligence Engine:
 * 1. Domestic Equities (NIFTY 50, SENSEX, Midcap, Sector contagion, Market breadth, INDIA VIX)
 * 2. Global Markets & Regional Disparity (US S&P/Nasdaq/Dow, Europe FTSE/DAX, Asia Nikkei/Hang Seng)
 * 3. Commodities & Energy (Brent Crude, WTI, Gold safe-haven bid)
 * 4. Currency & FX (USD/INR, DXY Dollar Index)
 * 5. Newsflow & Corporate Intelligence (FinBERT / Lexicon on verified live news)
 * 6. Clickable TL;DR headlines linking directly to verified sources
 * 7. BART TL;DR summarization of top stories
 * 8. Zero-shot category tagging
 */

import { classifyFinancialSentiment, type SentimentLabel } from "@/lib/hf/finbert";
import { classifyNewsHeadlines } from "@/lib/hf/news-classifier";
import { scoreHeadlineLexicon } from "@/lib/feeds/sentiment-lexicon";
import {
  aggregateLexiconHeadlines,
  buildFallbackTldr,
  computeMultiPillarSentiment,
  explainHeadlineSentiment,
  finbertToNewsIntel,
  formatNewsSource,
  type NewsIntelItem,
} from "@/lib/hf/news-intel-aggregate";
import { summarizeItems } from "@/lib/hf/summarizer";
import { getFeedHubCached, peekFeedHubCache } from "@/lib/feeds/hub-cache";
import type { FeedHubPayload } from "@/lib/feeds/types";
import { buildLiveTicker } from "@/lib/macro/build-live-ticker";
import { buildIndiaDashboardQuick } from "@/lib/feeds/india/build-dashboard";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CACHE_TTL_MS = 60_000;
let cachedPayload: { at: number; data: unknown } | null = null;
let inflightPromise: Promise<unknown> | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const fallbackHub: FeedHubPayload = {
  fetchedAt: new Date().toISOString(),
  health: [],
  news: [],
  quotes: [],
  macro: [],
  indices: [],
};

async function computeNewsIntel() {
  const hubPromise = peekFeedHubCache()
    ? Promise.resolve(peekFeedHubCache()!)
    : withTimeout(getFeedHubCached(), 4000, fallbackHub);

  const [hub, liveTicker, dashboard] = await Promise.all([
    hubPromise,
    withTimeout(buildLiveTicker(), 4000, { fetchedAt: new Date().toISOString(), items: [] }),
    withTimeout(buildIndiaDashboardQuick().catch(() => null), 3500, null),
  ]);

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

  const headlines = news.map((n) => n.title.trim());
  const topHeadlines = headlines.slice(0, 6);
  const hasHfToken = Boolean(process.env.HF_TOKEN?.trim());

  let rawNewsSentiment = aggregateLexiconHeadlines(topHeadlines);
  const itemSentiments: { label: SentimentLabel; score: number }[] = [];

  if (hasHfToken && topHeadlines.length > 0) {
    try {
      const finbert = await withTimeout(classifyFinancialSentiment(topHeadlines), 4000, []);
      if (finbert.length > 0) {
        rawNewsSentiment = finbertToNewsIntel(finbert);
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

  // Compute comprehensive 5-pillar market sentiment
  const sentiment = computeMultiPillarSentiment({
    tickerItems: liveTicker.items,
    breadth: dashboard?.pulse?.breadth,
    newsSentiment: rawNewsSentiment,
    newsItems: items,
  });

  const [classifiedResults, tldrResult] = await Promise.allSettled([
    hasHfToken && headlines.length > 0 ? withTimeout(classifyNewsHeadlines(headlines.slice(0, 6)), 4000, []) : Promise.resolve([]),
    hasHfToken && topHeadlines.length > 0 ? withTimeout(summarizeItems(topHeadlines, 60), 4000, "") : Promise.resolve(""),
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

  return {
    sentiment,
    tldr,
    items,
    categories,
    analyzedCount: items.length,
    asOf: hub.fetchedAt ?? new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const now = Date.now();
    if (cachedPayload && now - cachedPayload.at < CACHE_TTL_MS) {
      return NextResponse.json(cachedPayload.data);
    }

    if (!inflightPromise) {
      inflightPromise = computeNewsIntel()
        .then((data) => {
          cachedPayload = { at: Date.now(), data };
          return data;
        })
        .finally(() => {
          inflightPromise = null;
        });
    }

    const result = await inflightPromise;
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
