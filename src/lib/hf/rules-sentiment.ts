/**
 * Strong rule-based financial sentiment engine.
 *
 * Used as the fallback when the FinBERT model is unavailable (the "Keyword
 * estimate" path on the research sentiment card).  It deliberately beats the
 * naive substring-count approach it replaces:
 *
 *  • Whole-word / whole-phrase matching — "up" no longer fires inside "group",
 *    and bare "record" no longer fires on "record date".
 *  • Weighted finance phrases ("profit warning" −3 beats "growth" +1), so a
 *    strong signal wins over weak noise.
 *  • Negation handling — "fails to win order", "denies fraud" flip/neutralise
 *    the phrase they precede instead of being scored at face value.
 *  • Percentage-move scaling — "surged 7%" counts, "up 0.32%" is honest noise.
 *  • Greedy longest-match blanking — "order book" is not double-counted with
 *    bare "order".
 *
 * Output shape is FinBertResult-compatible so the panel aggregation needs no
 * changes.  This is a lexical estimate, not model inference — callers must
 * keep the "Keyword estimate" label.
 */

export type RulesSentimentLabel = "positive" | "negative" | "neutral";

export interface RulesSentimentResult {
  label: RulesSentimentLabel;
  /** 0..1 confidence of the top label */
  score: number;
  /** All three class scores, sorted descending (FinBertResult-compatible) */
  scores: { label: RulesSentimentLabel; score: number }[];
  engine: "rules";
  /** Phrases/words that fired, for explainability */
  signals: string[];
}

type WeightedPhrase = { phrase: string; weight: number };

// Ordered by specificity — matching is greedy longest-first with blanking,
// so entries like "order book" must come before bare "order".
const PHRASES: WeightedPhrase[] = [
  // ---- strong positives (+3) ----
  { phrase: "beats estimates", weight: 3 },
  { phrase: "beat estimates", weight: 3 },
  { phrase: "record profit", weight: 3 },
  { phrase: "record revenue", weight: 3 },
  { phrase: "record sales", weight: 3 },
  { phrase: "record earnings", weight: 3 },
  { phrase: "profit jumps", weight: 3 },
  { phrase: "profit surges", weight: 3 },
  { phrase: "price target raised", weight: 3 },
  { phrase: "raises price target", weight: 3 },
  { phrase: "raised price target", weight: 3 },
  { phrase: "upgraded to buy", weight: 3 },
  { phrase: "all time high", weight: 3 },
  { phrase: "all-time high", weight: 3 },
  { phrase: "record high", weight: 3 },
  { phrase: "breakthrough", weight: 3 },
  // ---- medium positives (+2) ----
  { phrase: "earnings beat", weight: 2 },
  { phrase: "strong results", weight: 2 },
  { phrase: "strong earnings", weight: 2 },
  { phrase: "strong quarter", weight: 2 },
  { phrase: "order win", weight: 2 },
  { phrase: "wins order", weight: 2 },
  { phrase: "contract win", weight: 2 },
  { phrase: "order book", weight: 2 },
  { phrase: "upper circuit", weight: 2.5 },
  { phrase: "margin expansion", weight: 2 },
  { phrase: "dividend", weight: 1.5 },
  { phrase: "buyback", weight: 1.5 },
  { phrase: "share buyback", weight: 1.5 },
  { phrase: "bonus issue", weight: 1.5 },
  { phrase: "promoter buying", weight: 1.5 },
  { phrase: "raises stake", weight: 1.5 },
  { phrase: "increases stake", weight: 1.5 },
  { phrase: "surge", weight: 2 },
  { phrase: "soar", weight: 2 },
  { phrase: "rally", weight: 2 },
  { phrase: "outperform", weight: 2 },
  { phrase: "upgrade", weight: 2 },
  { phrase: "bullish", weight: 2 },
  { phrase: "backlog", weight: 1 },
  { phrase: "expansion", weight: 1.5 },
  { phrase: "partnership", weight: 1.5 },
  { phrase: "deal win", weight: 2 },
  { phrase: "growth", weight: 1 },
  { phrase: "profit", weight: 1 },
  { phrase: "gains", weight: 1.5 },
  { phrase: "gain", weight: 1 },
  { phrase: "recovery", weight: 1.5 },
  { phrase: "launch", weight: 1 },
  { phrase: "approval", weight: 1 },
  { phrase: "clearance", weight: 1 },
  { phrase: "inflow", weight: 1 },
  { phrase: "order", weight: 1 },
  { phrase: "52 week high", weight: 1.5 },
  // ---- neutral finance filler: matched explicitly so they add nothing ----
  { phrase: "price target", weight: 0 },
  { phrase: "target price", weight: 0 },
  { phrase: "forecast", weight: 0 },
  { phrase: "prediction", weight: 0 },
  { phrase: "predictions", weight: 0 },
  { phrase: "analyst", weight: 0 },
  { phrase: "q1 numbers", weight: 0 },
  { phrase: "q1 results", weight: 0 },
  { phrase: "q2 numbers", weight: 0 },
  { phrase: "q2 results", weight: 0 },
  { phrase: "q3 numbers", weight: 0 },
  { phrase: "q3 results", weight: 0 },
  { phrase: "q4 numbers", weight: 0 },
  { phrase: "q4 results", weight: 0 },
  { phrase: "record date", weight: 0 },
  { phrase: "board meet", weight: 0 },
  { phrase: "stock split", weight: 0.5 },
  // ---- strong negatives (−3) ----
  { phrase: "misses estimates", weight: -3 },
  { phrase: "miss estimates", weight: -3 },
  { phrase: "profit warning", weight: -3 },
  { phrase: "guidance cut", weight: -3 },
  { phrase: "cuts guidance", weight: -3 },
  { phrase: "cut guidance", weight: -3 },
  { phrase: "price target cut", weight: -3 },
  { phrase: "cuts price target", weight: -3 },
  { phrase: "cut price target", weight: -3 },
  { phrase: "downgraded to sell", weight: -3 },
  { phrase: "fraud", weight: -3 },
  { phrase: "scam", weight: -3 },
  { phrase: "default", weight: -3 },
  { phrase: "bankruptcy", weight: -3 },
  { phrase: "plunge", weight: -2.5 },
  { phrase: "crash", weight: -3 },
  { phrase: "crisis", weight: -3 },
  { phrase: "lower circuit", weight: -2.5 },
  // ---- medium negatives (−2 / −1.5) ----
  { phrase: "weak results", weight: -2 },
  { phrase: "weak earnings", weight: -2 },
  { phrase: "weak quarter", weight: -2 },
  { phrase: "margin pressure", weight: -2 },
  { phrase: "underperform", weight: -2 },
  { phrase: "downgrade", weight: -2 },
  { phrase: "bearish", weight: -2 },
  { phrase: "layoff", weight: -2 },
  { phrase: "layoffs", weight: -2 },
  { phrase: "investigation", weight: -2 },
  { phrase: "probe", weight: -2 },
  { phrase: "penalty", weight: -1.5 },
  { phrase: "warning", weight: -1.5 },
  { phrase: "loss", weight: -1.5 },
  { phrase: "losses", weight: -1.5 },
  { phrase: "decline", weight: -1.5 },
  { phrase: "fall", weight: -1.5 },
  { phrase: "drop", weight: -1.5 },
  { phrase: "slide", weight: -1.5 },
  { phrase: "tumble", weight: -2 },
  { phrase: "slump", weight: -2 },
  { phrase: "selloff", weight: -2 },
  { phrase: "sell off", weight: -2 },
  { phrase: "debt", weight: -1 },
  { phrase: "slowdown", weight: -1.5 },
  { phrase: "risk", weight: -0.5 },
  { phrase: "concern", weight: -0.5 },
  { phrase: "concerns", weight: -0.5 },
  { phrase: "52 week low", weight: -1.5 },
];

/** Negation triggers: the positive phrase that follows (within a few tokens) is flipped. */
const NEGATIONS = [
  "fails to",
  "failed to",
  "fail to",
  "misses",
  "missed",
  "falls short",
  "fell short",
  "unable to",
  "denies",
  "denied",
  "rejects",
  "rejected",
  "dismisses",
  "dismissed",
  "rules out",
  "\\bnot\\b",
  "\\bno\\b",
  "\\bnever\\b",
  "n't",
];

/** Directional move + explicit percent: "surged 7%", "down 3.2%", "higher by 5%" */
const MOVE_UP = /\b(up|higher|rose|rises?|gains?|gained|climbs?|climbed|surged?|soared?|jumped?|rallied?|rally)\b\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*(%|percent)(?![a-z])/i;
const MOVE_DOWN = /\b(down|lower|fell|falls?|dropped?|drops?|declined?|declines?|slid|slides?|tumbled?|plunged?|crashed?)\b\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*(%|percent)(?![a-z])/i;

/** Also catch "<pct>% higher/lower" word order: "7% higher", "3% lower" */
const MOVE_PCT_FIRST = /\b(\d+(?:\.\d+)?)\s*%\s+(higher|up|lower|down)\b/i;

/** |pct| -> weight: sub-1% is market noise, not signal. */
function pctWeight(pct: number): number {
  const a = Math.abs(pct);
  if (a < 1) return 0;
  if (a < 3) return 0.5;
  if (a < 7) return 1;
  return 1.5;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp);|&#\d+;|&#x[0-9a-f]+;/gi, " ")
    .replace(/[^a-z0-9%.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phraseRegex(phrase: string): RegExp {
  const words = phrase.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b${words.join("\\s+")}\\b`, "g");
}

function isNegated(before: string): boolean {
  // Look at the ~8 tokens preceding the match for a negation trigger.
  const tail = ` ${before.trim().split(/\s+/).slice(-8).join(" ")} `;
  return NEGATIONS.some((n) => new RegExp(n, "i").test(tail));
}

export function scoreTextRules(rawText: string): RulesSentimentResult {
  const text = ` ${normalize(rawText)} `;
  let working = text;
  let total = 0;
  const signals: string[] = [];

  // Greedy longest-phrase-first matching with blanking (prevents double counting).
  const ordered = [...PHRASES].sort(
    (a, b) => b.phrase.split(/\s+/).length - a.phrase.split(/\s+/).length || b.phrase.length - a.phrase.length,
  );
  for (const { phrase, weight } of ordered) {
    const re = phraseRegex(phrase);
    let m: RegExpExecArray | null;
    while ((m = re.exec(working)) !== null) {
      const start = m.index;
      const before = working.slice(Math.max(0, start - 60), start);
      let w = weight;
      if (weight > 0 && isNegated(before)) {
        // "fails to win order" -> negative, with an extra penalty for the failure itself.
        w = -weight - 0.5;
      } else if (weight < 0 && isNegated(before)) {
        // "denies fraud" -> the allegation is contested; neutralise, don't flip to positive.
        w = 0;
      }
      if (w !== 0) {
        total += w;
        signals.push(`${w > 0 ? "+" : ""}${w} ${phrase}`);
      }
      // Blank the matched span so shorter phrases can't re-match inside it.
      working = working.slice(0, start) + " ".repeat(m[0].length) + working.slice(start + m[0].length);
      re.lastIndex = start + m[0].length;
    }
  }

  // Explicit percent moves on the blanked text (phrases like "surge" may have been consumed).
  const upMatch = MOVE_UP.exec(text);
  if (upMatch) {
    const w = pctWeight(parseFloat(upMatch[2]!));
    if (w) {
      total += w;
      signals.push(`+${w} ${upMatch[1]} ${upMatch[2]}%`);
    }
  }
  const downMatch = MOVE_DOWN.exec(text);
  if (downMatch) {
    const w = pctWeight(parseFloat(downMatch[2]!));
    if (w) {
      total -= w;
      signals.push(`-${w} ${downMatch[1]} ${downMatch[2]}%`);
    }
  }
  const pctFirst = MOVE_PCT_FIRST.exec(text);
  if (pctFirst && !upMatch && !downMatch) {
    const w = pctWeight(parseFloat(pctFirst[1]!));
    const dir = /higher|up/i.test(pctFirst[2]!) ? 1 : -1;
    if (w) {
      total += dir * w;
      signals.push(`${dir > 0 ? "+" : "-"}${w} ${pctFirst[1]}% ${pctFirst[2]}`);
    }
  }

  const label: RulesSentimentLabel = total >= 1.5 ? "positive" : total <= -1.5 ? "negative" : "neutral";
  // Confidence grows with evidence, capped; neutral with no signal stays modest.
  const confidence =
    label === "neutral"
      ? total === 0
        ? 0.65
        : 0.55
      : Math.min(0.55 + 0.08 * Math.min(Math.abs(total), 5), 0.95);

  const rest = 1 - confidence;
  const scores =
    label === "positive"
      ? [
          { label: "positive" as const, score: confidence },
          { label: "neutral" as const, score: rest * 0.7 },
          { label: "negative" as const, score: rest * 0.3 },
        ]
      : label === "negative"
        ? [
            { label: "negative" as const, score: confidence },
            { label: "neutral" as const, score: rest * 0.7 },
            { label: "positive" as const, score: rest * 0.3 },
          ]
        : [
            { label: "neutral" as const, score: confidence },
            { label: "positive" as const, score: rest * 0.5 },
            { label: "negative" as const, score: rest * 0.5 },
          ];

  return { label, score: confidence, scores, engine: "rules", signals };
}
