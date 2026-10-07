/**
 * In-house tone scorer for earnings-call segments. Zero cost, zero network, no model:
 * a finance word list (in the spirit of the Loughran–McDonald dictionary, which exists because
 * general-purpose lexicons mislabel words like "liability" or "capital") plus negation handling,
 * run in a single pass over the tokens (~1 ms per 10k words).
 *
 * Score = (positive − negative) / (positive + negative), shrunk toward 0 when few cue words were
 * found, in −1..+1. Compare prepared remarks vs Q&A of the SAME call — the absolute level of a
 * call is biased upbeat (management talks its book), the delta is the signal.
 */

/** Stems of ≥ 5 letters, matched as word prefixes ("improv" → improve, improved, improving, improvement). */
const POS_STEMS = [
  "strong", "improv", "growing", "growth", "grew", "record", "robust", "confiden", "opportunit", "momentum", "expan", "accelerat", "outperform",
  "benefit", "healthy", "resilien", "exceed", "surpass", "upside", "optimis", "optimist", "encourag", "favourabl", "favorabl", "success", "profitab",
  "efficien", "leadership", "strengthen", "tailwind", "enhanc", "achiev", "advantage", "attractive", "buoyan", "steady", "stabil", "visibility",
  "traction", "excit", "delight", "proud", "excellent", "positive", "rebound", "recover", "uptick", "upturn", "surge", "boost", "innovat",
  "stellar", "comfortabl", "bullish", "thrive", "thriving", "accretive", "outstanding", "milestone", "breakthrough", "turnaround", "gaining", "winning",
] as const;
/** Short or ambiguous words ("good morning", "up to", "higher cost") are deliberately left out. */
const POS_EXACT = new Set(["win", "wins", "won", "beat", "beats", "best", "gain", "gains", "solid"]);

const NEG_STEMS = [
  "weak", "declin", "decreas", "headwind", "pressure", "challeng", "uncertain", "volatil", "slowdown", "slowing", "slower", "delay", "disrupt",
  "difficult", "deteriorat", "impair", "downturn", "adverse", "concern", "shortfall", "subdued", "inflation", "litigation", "penalt", "default",
  "writeoff", "write-off", "writedown", "write-down", "shrink", "contraction", "erosion", "eroded", "erode", "underperform", "struggl", "disappoint",
  "unfavourabl", "unfavorabl", "negative", "cautious", "caution", "hamper", "constrain", "burden", "lacklust", "sluggish", "worry", "worries",
  "worried", "suffer", "bleed", "slump", "plunge", "tumbl", "crisis", "distress", "dilut", "loss", "lower-than", "bearish", "overhang", "hurt",
  "stagnan", "stagnat", "disrupt", "downgrad", "pullback", "weaker", "weakness", "reduced", "reduction", "unable", "failed", "failure",
] as const;
const NEG_EXACT = new Set(["fall", "falls", "fell", "falling", "drop", "drops", "dropped", "miss", "missed", "soft", "tough", "stress", "stressed", "cut", "cuts", "risk", "risks", "risky", "slow", "decline", "lag", "lagged", "lagging"]);

const POS_RE = new RegExp(`^(?:${POS_STEMS.join("|")})`);
const NEG_RE = new RegExp(`^(?:${NEG_STEMS.join("|")})`);
const NEGATORS = new Set(["not", "no", "never", "without", "hardly", "neither", "nor", "none", "nothing", "cannot", "isn't", "wasn't", "aren't", "don't", "doesn't", "didn't", "won't", "wouldn't", "can't", "couldn't", "haven't", "hasn't", "hadn't"]);
/** Words that cancel a negation window ("not only strong …", "no doubt strong"). */
const NEGATION_BREAK = new Set(["but", "however", "although", "though", "while", "and", "because", "so"]);
/** Safe-harbor boilerplate in every prepared-remarks opening ("risks and uncertainties") would otherwise read as negative tone. */
const BOILERPLATE = /forward[- ]looking|safe harbou?r|risks? and uncertaint|actual results may differ|no (?:obligation|responsibility) to (?:update|publicly)|disclaimer|cautionary statement|annual report/i;

export type ToneCount = { pos: number; neg: number };

const polarity = (tok: string): 1 | -1 | 0 => {
  if (POS_EXACT.has(tok) || (tok.length >= 5 && POS_RE.test(tok))) return 1;
  if (NEG_EXACT.has(tok) || (tok.length >= 5 && NEG_RE.test(tok))) return -1;
  return 0;
};

/** Cue-word counts for a text, with a 3-token negation window ("no concerns" → positive, "not strong" → negative). */
export function countTone(text: string): ToneCount {
  let pos = 0;
  let neg = 0;
  const sentences = text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    if (BOILERPLATE.test(s)) continue;
    const toks = s.toLowerCase().replace(/[’]/g, "'").match(/[a-z]+(?:[-'][a-z]+)*/g) ?? [];
    let negateLeft = 0;
    for (const t of toks) {
      if (NEGATORS.has(t) || t.endsWith("n't")) {
        negateLeft = 3;
        continue;
      }
      if (NEGATION_BREAK.has(t)) negateLeft = 0;
      const p = polarity(t);
      if (p !== 0) {
        const eff = negateLeft > 0 ? -p : p;
        if (eff > 0) pos++;
        else neg++;
      }
      if (negateLeft > 0) negateLeft--;
    }
  }
  return { pos, neg };
}

/** Minimum cue words before a score is trusted; below this the segment is too thin to read a tone from. */
export const MIN_CUES = 6;
const SHRINK = 8;

/** −1..+1, or null when there is not enough signal. */
export function toneScore(text: string): number | null {
  const { pos, neg } = countTone(text);
  const n = pos + neg;
  if (n < MIN_CUES) return null;
  const raw = (pos - neg) / n;
  return Math.round(raw * (n / (n + SHRINK)) * 1000) / 1000;
}
