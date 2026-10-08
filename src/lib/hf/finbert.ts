/**
 * FinBERT sentiment classifier — ProsusAI/finbert
 *
 * Returns { label: "positive"|"negative"|"neutral", score: number } for a
 * piece of financial text.  Short texts (< 512 tokens) work best.
 *
 * HF free tier: ~1 req/sec without token, ~10 req/sec with HF_TOKEN.
 * We cache results for 30 min because news sentiment doesn't change that quickly.
 */

import { hfInfer } from "@/lib/hf/client";
import { scoreTextRules } from "@/lib/hf/rules-sentiment";

export type SentimentLabel = "positive" | "negative" | "neutral";

export interface FinBertResult {
  label: SentimentLabel;
  score: number; // 0..1, confidence of the top label
  /** All three class scores, sorted descending */
  scores: { label: SentimentLabel; score: number }[];
  /** "finbert" = real model output; "rules" = keyword fallback (HF unavailable). */
  engine?: "finbert" | "rules";
}

/** Raw HF response shape for classification pipelines */
type HfClassLabel = { label: string; score: number };
type HfClassResponse = HfClassLabel[][];

const MODEL = "ProsusAI/finbert";
const TTL_MS = 30 * 60 * 1000; // 30 min

/**
 * Run FinBERT on up to 5 pieces of text.
 * Texts longer than ~400 words are truncated at the first 400 words to stay
 * within the 512-token limit.
 */
export async function classifyFinancialSentiment(texts: string[]): Promise<FinBertResult[]> {
  if (texts.length === 0) return [];

  // Truncate to safe token budget (~400 words ≈ 512 sub-word tokens)
  const safe = texts.slice(0, 5).map((t) => t.split(/\s+/).slice(0, 400).join(" "));

  try {
    const raw = await hfInfer<string[], HfClassResponse>(MODEL, safe, {
      ttlMs: TTL_MS,
      cacheKey: `finbert::${safe.join("|")}`,
      maxRetries: 1,
      timeoutMs: 8_000,
    });

    return raw.map((candidates) => {
      const sorted = [...candidates].sort((a, b) => b.score - a.score) as { label: SentimentLabel; score: number }[];
      return {
        label: sorted[0]!.label as SentimentLabel,
        score: sorted[0]!.score,
        scores: sorted,
        engine: "finbert" as const,
      };
    });
  } catch (err) {
    console.warn("[FinBERT] API unavailable, using rule-based fallback:", err instanceof Error ? err.message : err);
    return safe.map((text) => ({ ...ruleBasedSentimentFallback(text), engine: "rules" as const }));
  }
}

/**
 * Rule-based fallback when the FinBERT API is unavailable.
 *
 * Delegates to the weighted finance-phrase engine in ./rules-sentiment
 * (whole-word matching, negation handling, percent-move scaling) and tags
 * the result so the UI can keep the honest "Keyword estimate" label.
 */
function ruleBasedSentimentFallback(text: string): FinBertResult {
  const r = scoreTextRules(text);
  return {
    label: r.label,
    score: r.score,
    scores: r.scores,
    engine: "rules" as const,
  };
}

/**
 * Classify a single text snippet — convenience wrapper.
 */
export async function classifySentiment(text: string): Promise<FinBertResult> {
  const [result] = await classifyFinancialSentiment([text]);
  if (!result) throw new Error("FinBERT returned empty response");
  return result;
}

/**
 * Aggregate multiple FinBERT results into a single market sentiment score.
 * Returns a value from -1 (max bearish) to +1 (max bullish).
 */
export function aggregateSentimentScore(results: FinBertResult[]): {
  score: number; // -1 to +1
  label: SentimentLabel;
  confidence: number; // 0..1
  breakdown: { positive: number; negative: number; neutral: number };
} {
  if (results.length === 0) return { score: 0, label: "neutral", confidence: 0, breakdown: { positive: 0, negative: 0, neutral: 0 } };

  let pos = 0, neg = 0, neu = 0;
  for (const r of results) {
    const pScore = r.scores.find((s) => s.label === "positive")?.score ?? 0;
    const nScore = r.scores.find((s) => s.label === "negative")?.score ?? 0;
    const eScore = r.scores.find((s) => s.label === "neutral")?.score ?? 0;
    pos += pScore;
    neg += nScore;
    neu += eScore;
  }

  const n = results.length;
  const posAvg = pos / n;
  const negAvg = neg / n;
  const neuAvg = neu / n;
  const score = posAvg - negAvg; // -1 to +1
  const confidence = Math.max(posAvg, negAvg, neuAvg);
  const label: SentimentLabel = score > 0.1 ? "positive" : score < -0.1 ? "negative" : "neutral";

  return { score, label, confidence, breakdown: { positive: posAvg, negative: negAvg, neutral: neuAvg } };
}
