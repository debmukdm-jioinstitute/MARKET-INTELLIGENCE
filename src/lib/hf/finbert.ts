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

export type SentimentLabel = "positive" | "negative" | "neutral";

export interface FinBertResult {
  label: SentimentLabel;
  score: number; // 0..1, confidence of the top label
  /** All three class scores, sorted descending */
  scores: { label: SentimentLabel; score: number }[];
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
    });

    return raw.map((candidates) => {
      const sorted = [...candidates].sort((a, b) => b.score - a.score) as { label: SentimentLabel; score: number }[];
      return {
        label: sorted[0]!.label as SentimentLabel,
        score: sorted[0]!.score,
        scores: sorted,
      };
    });
  } catch (err) {
    console.warn("[FinBERT] API unavailable, using rule-based fallback:", err instanceof Error ? err.message : err);
    return safe.map((text) => ruleBasedSentimentFallback(text));
  }
}

function ruleBasedSentimentFallback(text: string): FinBertResult {
  const lower = text.toLowerCase();
  const posWords = ["profit", "gain", "surge", "growth", "beat", "record", "jump", "bullish", "buy", "up", "high", "positive", "expansion", "dividend"];
  const negWords = ["loss", "fall", "drop", "decline", "miss", "plunge", "down", "bearish", "sell", "fraud", "downgrade", "negative", "debt", "risk", "warning"];

  let posCount = 0;
  let negCount = 0;
  for (const w of posWords) if (lower.includes(w)) posCount++;
  for (const w of negWords) if (lower.includes(w)) negCount++;

  if (posCount > negCount) {
    const score = Math.min(0.6 + posCount * 0.1, 0.95);
    return {
      label: "positive",
      score,
      scores: [
        { label: "positive", score },
        { label: "neutral", score: (1 - score) * 0.7 },
        { label: "negative", score: (1 - score) * 0.3 },
      ],
    };
  } else if (negCount > posCount) {
    const score = Math.min(0.6 + negCount * 0.1, 0.95);
    return {
      label: "negative",
      score,
      scores: [
        { label: "negative", score },
        { label: "neutral", score: (1 - score) * 0.7 },
        { label: "positive", score: (1 - score) * 0.3 },
      ],
    };
  } else {
    return {
      label: "neutral",
      score: 0.8,
      scores: [
        { label: "neutral", score: 0.8 },
        { label: "positive", score: 0.1 },
        { label: "negative", score: 0.1 },
      ],
    };
  }
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
