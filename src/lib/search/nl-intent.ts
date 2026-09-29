/**
 * Deterministic "is this a natural-language question, not a ticker/company
 * fragment?" heuristic for the unified search bar.
 *
 * No model, no network call — a sentence typed into a symbol search box has a
 * distinct shape from a ticker or company name: it's longer, starts with a
 * question word, or ends with "?". That's cheap, instant, and (unlike an
 * intent classifier) never wrong in a way that depends on training data
 * drifting away from this site's own vocabulary.
 */

const QUESTION_STARTERS = new Set([
  "how",
  "what",
  "why",
  "when",
  "where",
  "who",
  "which",
  "can",
  "could",
  "should",
  "would",
  "will",
  "does",
  "do",
  "is",
  "are",
  "explain",
  "tell",
  "help",
]);

export function isNaturalLanguageQuery(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (trimmed.includes("?")) return true;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 3) return false; // tickers / company names are almost never 3+ words without being a question

  const first = words[0]!.toLowerCase().replace(/[^a-z]/g, "");
  if (QUESTION_STARTERS.has(first)) return true;

  // 4+ space-separated words is very rarely a scrip name (even long ones like
  // "Jaiprakash Power Ventures" are 2-4 tokens); treat as a sentence.
  return words.length >= 4;
}
