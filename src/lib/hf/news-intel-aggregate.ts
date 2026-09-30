import type { SentimentLabel } from "@/lib/hf/finbert";
import { aggregateSentimentScore, type FinBertResult } from "@/lib/hf/finbert";
import { scoreHeadlineLexicon } from "@/lib/feeds/sentiment-lexicon";

export type NewsIntelSentiment = {
  score: number;
  label: SentimentLabel;
  confidence: number;
  breakdown: { positive: number; negative: number; neutral: number };
  mode: "finbert" | "lexicon";
};

export function aggregateLexiconHeadlines(headlines: string[]): NewsIntelSentiment {
  if (headlines.length === 0) {
    return {
      score: 0,
      label: "neutral",
      confidence: 0,
      breakdown: { positive: 0, negative: 0, neutral: 0 },
      mode: "lexicon",
    };
  }

  let pos = 0;
  let neg = 0;
  let neu = 0;
  let scoreSum = 0;

  for (const title of headlines) {
    const { score, label } = scoreHeadlineLexicon(title);
    scoreSum += Math.max(-1, Math.min(1, score / 2));
    if (label === "positive") pos += 1;
    else if (label === "negative") neg += 1;
    else neu += 1;
  }

  const n = headlines.length;
  const breakdown = { positive: pos / n, negative: neg / n, neutral: neu / n };
  const avgScore = scoreSum / n;
  const label: SentimentLabel =
    avgScore > 0.08 ? "positive" : avgScore < -0.08 ? "negative" : "neutral";
  const confidence = Math.max(breakdown.positive, breakdown.negative, breakdown.neutral);

  return { score: avgScore, label, confidence, breakdown, mode: "lexicon" };
}

export function finbertToNewsIntel(results: FinBertResult[]): NewsIntelSentiment {
  const agg = aggregateSentimentScore(results);
  return { ...agg, mode: "finbert" };
}

export function buildFallbackTldr(headlines: string[], label: SentimentLabel): string {
  const themes = headlines
    .slice(0, 4)
    .map((h) => h.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" · ");
  if (!themes) return "No headlines available to summarize right now.";
  return `Desk scan of ${headlines.length} headlines reads ${label}. Highlights: ${themes}.`.slice(0, 420);
}
