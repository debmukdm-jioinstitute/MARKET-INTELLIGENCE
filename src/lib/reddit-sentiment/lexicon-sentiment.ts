/**
 * Deterministic, keyword-based sentiment scoring for real Reddit post titles — not a trained
 * model. This exists because there is no ML sentiment classifier wired into this app, and a
 * fabricated-looking "62% positive" figure would be exactly the kind of made-up number this whole
 * feature was rebuilt to stop showing. A word-list score is real (computed from real text you can
 * re-derive by eye) even though it's crude: it will miss sarcasm, slang, and negation, and every
 * caller must say so.
 */

const BULLISH_WORDS = [
  "buy", "bought", "long", "bullish", "moon", "rally", "breakout", "surge", "rocket", "undervalued",
  "cheap", "upside", "target", "accumulate", "accumulating", "compounding", "multibagger", "outperform",
  "beat", "beats", "record profit", "strong results", "upgrade", "upgraded", "all-time high", "ath",
  "green", "bull", "gains", "profit booking delayed", "re-rating", "growth story",
];

const BEARISH_WORDS = [
  "sell", "sold", "short", "bearish", "crash", "dump", "overvalued", "expensive", "downgrade",
  "downgraded", "miss", "misses", "weak results", "loss", "losses", "scam", "fraud", "red flag",
  "avoid", "exit", "panic", "correction", "falling", "fell", "tanked", "circuit lower", "lower circuit",
  "bear", "bleeding", "trap", "pump and dump", "delisting", "default",
];

export type LexiconSentiment = { positive: boolean; negative: boolean };

/** Case-insensitive whole-word-ish match (word-boundary-adjacent) so "cheaper" doesn't trip "cheap" incorrectly for short words, while phrases like "record profit" still match as substrings. */
function containsAny(text: string, words: string[]): boolean {
  const t = ` ${text.toLowerCase()} `;
  return words.some((w) => (w.includes(" ") ? t.includes(w) : new RegExp(`[^a-z]${w}[^a-z]`, "i").test(t)));
}

export function scoreTitleSentiment(title: string): LexiconSentiment {
  return { positive: containsAny(title, BULLISH_WORDS), negative: containsAny(title, BEARISH_WORDS) };
}

export type SentimentTally = {
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  netSentimentScore: number;
};

/** Aggregates per-title lexicon hits into the same 0-100 percentage shape the UI already renders. A title matching both word lists counts toward both (mixed signal), matching neither counts as neutral. */
export function tallySentiment(titles: string[]): SentimentTally {
  if (titles.length === 0) return { positivePct: 0, negativePct: 0, neutralPct: 0, netSentimentScore: 0 };
  let pos = 0;
  let neg = 0;
  for (const t of titles) {
    const s = scoreTitleSentiment(t);
    if (s.positive && !s.negative) pos++;
    else if (s.negative && !s.positive) neg++;
    else if (s.positive && s.negative) {
      pos += 0.5;
      neg += 0.5;
    }
    // else: neither word list matched — counts as neutral via the 100 - pos - neg remainder below.
  }
  const n = titles.length;
  const positivePct = Math.round((pos / n) * 100);
  const negativePct = Math.round((neg / n) * 100);
  return {
    positivePct,
    negativePct,
    neutralPct: Math.max(0, 100 - positivePct - negativePct),
    netSentimentScore: positivePct - negativePct,
  };
}
