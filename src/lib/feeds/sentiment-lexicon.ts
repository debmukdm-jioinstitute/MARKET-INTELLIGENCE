/**
 * Lightweight open lexicon sentiment (no external model server).
 * Word lists inspired by public financial sentiment research (Loughran–McDonald style buckets).
 */

export type LexiconSentiment = "positive" | "neutral" | "negative";

const POSITIVE = new Set([
  "surge",
  "rally",
  "beat",
  "upgrade",
  "record",
  "growth",
  "profit",
  "gain",
  "outperform",
  "recovery",
  "strong",
  "bullish",
  "expansion",
  "dividend",
  "buyback",
  "launch",
  "win",
  "deal",
  "order",
  "partnership",
  "jump",
  "soar",
  "inflow",
  "allotment",
  "nfo",
  "breakthrough",
]);

const NEGATIVE = new Set([
  "slump",
  "crash",
  "fraud",
  "probe",
  "downgrade",
  "loss",
  "default",
  "bankruptcy",
  "bearish",
  "weak",
  "decline",
  "layoff",
  "scam",
  "penalty",
  "investigation",
  "underperform",
  "slide",
  "fall",
  "drop",
  "plunge",
  "selloff",
  "tumble",
  "crisis",
  "debt",
  "warning",
]);

export function scoreHeadlineLexicon(title: string): { score: number; label: LexiconSentiment } {
  const tokens = title
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  let score = 0;
  for (const t of tokens) {
    if (POSITIVE.has(t)) score += 1;
    if (NEGATIVE.has(t)) score -= 1;
  }
  const label: LexiconSentiment = score > 0 ? "positive" : score < 0 ? "negative" : "neutral";
  return { score, label };
}
