import { hfInfer } from "@/lib/hf/client";

/**
 * Concall transcript → "said vs guided" structure.
 *
 * Extractive-first by design: every guidance / driver / risk / Q&A bullet is a
 * real sentence from the transcript (so numbers can never be invented). The
 * optional abstractive pass (distilbart) is accepted only when every number in
 * its output also appears in its source text. Tone is scored in-house (concall-tone.ts):
 * no model, no network.
 */

/* ------------------------------------------------------------------ */
/* Structure: prepared remarks vs Q&A                                  */
/* ------------------------------------------------------------------ */

export type Turn = { speaker: string; text: string };

const SPEAKER_RE = /(?:^|\s)((?:Mr\.|Ms\.|Mrs\.|Dr\.|CA|CS)?\s?[A-Z][A-Za-z.'’-]+(?:\s[A-Z][A-Za-z.'’-]+){0,3})\s?:\s/g;

/** Real speaker labels = "Name:" tokens that recur (filters out stray "Note:" / "Date:"). */
export function parseTurns(text: string): Turn[] {
  const hits = [...text.matchAll(SPEAKER_RE)].map((m) => ({ name: m[1].trim(), start: m.index! + (m[0].length - m[0].trimStart().length), end: m.index! + m[0].length }));
  const freq = new Map<string, number>();
  for (const h of hits) freq.set(h.name, (freq.get(h.name) ?? 0) + 1);
  const real = hits.filter((h) => (freq.get(h.name) ?? 0) >= 2 || h.name === "Moderator");
  const turns: Turn[] = [];
  real.forEach((h, i) => {
    const body = text.slice(h.end, real[i + 1]?.start ?? text.length).replace(/\s+/g, " ").trim();
    if (body) turns.push({ speaker: h.name, text: body });
  });
  return turns;
}

const FIRST_Q = /(?:first|next)\s+question\s+(?:is|comes)\s+from|line\s+of\s+[A-Z]/i;
const QA_START = /question[- ]and[- ]answer session\s+(?:now|will|begins)|we will now (?:begin|start|take)|open(?:ing)? (?:the )?(?:floor|lines?) for (?:questions|Q&A)|begin the Q&A/i;

export type Split = { prepared: Turn[]; qa: Turn[]; found: boolean; analysts: Set<string> };

/** Splits at the moderator's first-question handoff. `found=false` when no Q&A segment can be identified. */
export function splitTranscript(text: string): Split {
  const turns = parseTurns(text);
  const callStart = turns.findIndex((t) => t.speaker === "Moderator");
  const live = callStart >= 0 ? turns.slice(callStart) : [];
  const analysts = new Set<string>();
  for (const t of live) {
    if (t.speaker !== "Moderator") continue;
    for (const m of t.text.matchAll(/line of ([A-Z][A-Za-z.'’-]+(?:\s[A-Z][A-Za-z.'’-]+){0,3}?)(?:\s+(?:from|of|with|at)\b|\.|,)/g)) analysts.add(m[1].trim());
  }
  let idx = live.findIndex((t, i) => t.speaker === "Moderator" && i > 0 && FIRST_Q.test(t.text));
  if (idx < 0) idx = live.findIndex((t, i) => t.speaker === "Moderator" && i > 1 && QA_START.test(t.text));
  if (idx < 0) return { prepared: live.filter((t) => t.speaker !== "Moderator"), qa: [], found: false, analysts };
  return { prepared: live.slice(0, idx).filter((t) => t.speaker !== "Moderator"), qa: live.slice(idx), found: true, analysts };
}

/* ------------------------------------------------------------------ */
/* Sentence selection                                                  */
/* ------------------------------------------------------------------ */

const STOP = new Set("a an the and or but if of to in on for with as at by from that this these those is are was were be been being it its we our us you your they their i he she not no so do does did have has had will would can could should may might also just than then there here which who whom what when where how very more most some such into over about up out all any each other thank thanks please sir madam question questions line go ahead".split(" "));
const words = (s: string) => s.toLowerCase().match(/[a-z][a-z0-9%&-]{2,}/g) ?? [];
const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** PDF running headers/footers ("Acme Limited September 15, 2026 Page 4 of 13") that bleed into sentences. */
const PAGE_NOISE = /(?:[A-Z][A-Za-z&.,'-]*\s+){1,8}(?:Limited|Ltd\.?)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\s+Page\s+\d+\s+of\s+\d+|Page\s+\d+\s+of\s+\d+/g;

export function sentencesOf(text: string): string[] {
  return text
    .replace(PAGE_NOISE, " ")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'‘“(])/)
    .map((s) => s.trim())
    .filter((s) => {
      const n = wordCount(s);
      return n >= 8 && n <= 55 && !/^(thank you|thanks|good (morning|afternoon|evening)|ladies and gentlemen)/i.test(s);
    });
}

const HAS_NUMBER = /\d/;
const QUANT = /(\d+(?:\.\d+)?\s?(?:%|per ?cent|bps|basis points|crore|cr\b|lakh|million|mn|billion|bn|x\b|times|mw|gw|tonnes?|units?)|(?:rs\.?|inr|₹)\s?\d|\b(?:fy|q[1-4])\s?\d{2})/i;
const GUIDANCE = /\b(guid\w*|expect\w*|anticipat\w*|target\w*|aim\w*|outlook|going forward|next (?:quarter|year|fiscal)|forecast\w*|project\w*|on track to|plan to|should (?:reach|grow|achieve)|looking at|by (?:fy|march|the end of))\b/i;
const DRIVER = /\b(driven by|growth|momentum|demand|new (?:launch\w*|products?|orders?|customers?|clients?|markets?)|capacity|expansion|market share|order ?book|pipeline|traction|ramp[- ]?up|wins?|scal\w+)\b/i;
const RISK = /\b(risks?|headwinds?|challeng\w+|pressure|uncertain\w*|volatil\w*|inflation\w*|competition|slowdown|weak\w*|declin\w+|delays?|delayed|regulatory|currency|working capital|concerns?|worr\w+)\b/i;
const UPBEAT = /\b(opportunit\w+|tremendous|robust|confident|confidence|excited|strong\w*|record|no (?:tariff|restriction)\w*)\b/i;
/** Risk sentence: a risk cue, not the "as far as X is concerned" idiom, and not an upbeat sentence that merely mentions a risk word. */
const isRisk = (s: string) => RISK.test(s.replace(/\b(?:as|so) far as [^,.]{0,80}\b(?:is|are) concerned\b/gi, "")) && !UPBEAT.test(s);
const QUESTION = /\?|^(?:can|could|would|what|how|why|when|where|which|is|are|do|does|any)\b|\bif you could\b|\bwanted to (?:understand|ask|know)\b/i;

/** Document-level term weights: words repeated across the call matter more. */
function termWeights(sents: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const s of sents) for (const w of new Set(words(s))) if (!STOP.has(w)) tf.set(w, (tf.get(w) ?? 0) + 1);
  const w = new Map<string, number>();
  for (const [k, v] of tf) w.set(k, v >= 2 ? Math.log(1 + v) : 0.2);
  return w;
}

function score(s: string, weights: Map<string, number>, pos: number, total: number): number {
  const ws = words(s).filter((w) => !STOP.has(w));
  if (!ws.length) return 0;
  const base = ws.reduce((a, w) => a + (weights.get(w) ?? 0), 0) / Math.sqrt(ws.length);
  const earlyBonus = total > 1 ? (1 - pos / total) * 0.4 : 0; // mild preference for headline remarks
  return base + earlyBonus + (HAS_NUMBER.test(s) ? 0.6 : 0);
}

const jaccard = (a: string, b: string) => {
  const A = new Set(words(a));
  const B = new Set(words(b));
  const inter = [...A].filter((x) => B.has(x)).length;
  return inter / (A.size + B.size - inter || 1);
};

function top(sents: string[], weights: Map<string, number>, total: number, k: number, positions: Map<string, number>): string[] {
  const ranked = [...sents].sort((a, b) => score(b, weights, positions.get(b) ?? 0, total) - score(a, weights, positions.get(a) ?? 0, total));
  const picked: string[] = [];
  for (const s of ranked) {
    if (picked.length >= k) break;
    if (picked.every((p) => jaccard(p, s) < 0.5)) picked.push(s); // no near-duplicates
  }
  return picked;
}

export type Highlights = { guidance: string[]; growthDrivers: string[]; risks: string[]; qaThemes: string[] };

/**
 * Pure highlight extraction. Guidance must be quantitative (a number with a unit, percent, rupee or period).
 * Returns verbatim sentences — quote them as extracts, never as paraphrase.
 */
export function extractHighlights(split: Split): Highlights {
  const prepSents = split.prepared.flatMap((t) => sentencesOf(t.text));
  const pos = new Map(prepSents.map((s, i) => [s, i]));
  const weights = termWeights(prepSents);
  const guidance = prepSents.filter((s) => GUIDANCE.test(s) && QUANT.test(s));
  const used = new Set<string>();
  const pickFrom = (pool: string[], k: number) => {
    const chosen = top(pool.filter((s) => !used.has(s)), weights, prepSents.length, k, pos);
    chosen.forEach((s) => used.add(s));
    return chosen;
  };
  const g = pickFrom(guidance, 5);
  const growthDrivers = pickFrom(prepSents.filter((s) => DRIVER.test(s) && !isRisk(s)), 4);
  const risks = pickFrom(prepSents.filter(isRisk), 4);

  // Q&A themes: what analysts kept pushing on = their own questions, strongest repeated-topic ones first.
  const asked = split.qa.filter((t) => t.speaker !== "Moderator" && split.analysts.has(t.speaker)).flatMap((t) => sentencesOf(t.text)).filter((s) => QUESTION.test(s));
  const qaPos = new Map(asked.map((s, i) => [s, i]));
  const qaThemes = top(asked, termWeights(asked), asked.length, 5, qaPos);
  return { guidance: g, growthDrivers, risks, qaThemes };
}

/* ------------------------------------------------------------------ */
/* Numbers guard (hallucination check for any abstractive output)       */
/* ------------------------------------------------------------------ */

export const numbersIn = (s: string): string[] => (s.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, ""));
/** True when every number in `candidate` also appears in `source`. */
export function numbersSupported(candidate: string, source: string): boolean {
  const have = new Set(numbersIn(source));
  return numbersIn(candidate).every((n) => have.has(n));
}

/* ------------------------------------------------------------------ */
/* Meta                                                                */
/* ------------------------------------------------------------------ */

/** "Q1 FY2026-27" / "Q1 FY27" / "Q1 FY 2027" → "Q1 FY27". */
export function detectQuarter(text: string): string | null {
  const m = /\bQ([1-4])\s*[-–]?\s*FY\s*['’]?\s*(?:20)?(\d{2})(?:\s*[-–/]\s*(?:20)?(\d{2}))?/i.exec(text.slice(0, 6000));
  return m ? `Q${m[1]} FY${m[3] ?? m[2]}` : null;
}

/* ------------------------------------------------------------------ */
/* Optional abstractive polish (off by default — needs HF)             */
/* ------------------------------------------------------------------ */

export const SUMMARY_MODEL = "sshleifer/distilbart-cnn-12-6";

/**
 * Optional abstractive polish: summarises a bucket's source sentences, keeps only
 * output sentences whose numbers all occur in the source. Null when HF is unavailable
 * or nothing survives — the extractive bullets then stand.
 */
export async function abstractBullets(sourceSentences: string[]): Promise<string[] | null> {
  const source = sourceSentences.join(" ").split(/\s+/).slice(0, 400).join(" ");
  if (wordCount(source) < 40) return null;
  try {
    const raw = await hfInfer<{ inputs: string; parameters: { max_length: number; min_length: number } }, { summary_text: string }[]>(
      SUMMARY_MODEL,
      { inputs: source, parameters: { max_length: 90, min_length: 25 } },
      { ttlMs: 3600_000, maxRetries: 2, cacheKey: `concall-sum::${source.length}::${source.slice(0, 200)}` },
    );
    const out = (raw?.[0]?.summary_text ?? "").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => wordCount(s) >= 5 && numbersSupported(s, source));
    return out.length ? out.slice(0, 4) : null;
  } catch {
    return null;
  }
}
