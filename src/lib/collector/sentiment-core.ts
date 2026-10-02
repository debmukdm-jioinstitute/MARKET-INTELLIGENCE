import { createHash } from "node:crypto";

/**
 * Pure building blocks for the sentiment collector: ticker attribution,
 * spam/pump filtering, topic keywords and daily aggregation. No I/O.
 */

export type Source = "reddit" | "telegram" | "youtube" | "gdelt";
export type Register = "social" | "news";

export type Item = {
  source: Source;
  register: Register;
  text: string;
  author: string | null; // null for channels/aggregates
  day: string; // YYYY-MM-DD (IST)
  forwarded?: boolean;
  /** Pre-attributed symbol (YouTube comments belong to the video's company). */
  symbol?: string;
};

/* ------------------------------------------------------------------ */
/* Ticker attribution                                                  */
/* ------------------------------------------------------------------ */

/** Words that are also tickers / company first-words but are far more often plain English or generic. */
const COMMON = new Set("great supreme action value angel apollo ace art max sun star blue green apex alpha beta delta omega prime peak core zen vivid pearl royal swan lotus ocean river rock stone crown eagle tiger lion hero ultra india indian bank banks power steel global limited finance financial capital industries industry energy infra infrastructure group holdings services technologies technology systems solutions enterprises corporation company national international general united new first one all time pharma pharmaceuticals life motors auto foods food oil gas gold silver cement paper sugar textiles ultra star sun blue green royal prime super mega max home city land real real estate".split(" "));

const norm = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/\b(?:ltd|limited)\b\.?/g, " ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

export type Matcher = (text: string) => string[];

/**
 * Deterministic matcher over a [symbol, company name] universe:
 *  - cashtags ($TCS)           → always
 *  - ALL-CAPS symbol tokens    → symbols ≥ 3 chars that are not common English words
 *  - company-name phrases      → full name, first-two-words, or a unique, distinctive first word (≥ 5 letters)
 */
/** 3-letter tickers distinctive enough to match as bare ALL-CAPS words; any other symbol of ≤ 3 letters needs a $cashtag. */
const SHORT_CAPS_OK = new Set(["TCS", "ITC", "HAL", "BEL", "IOC", "PFC", "REC", "SBI", "LIC", "NTPC"]);

export function buildMatcher(universe: ReadonlyArray<readonly [string, string, ...string[]]>): Matcher {
  const symbols = new Set(universe.map((u) => u[0].toUpperCase()));
  const aliases = new Map<string, string | null>(); // alias → symbol (null = ambiguous)
  const firstWordCount = new Map<string, number>();
  const cleaned = universe.map((u) => ({ sym: u[0].toUpperCase(), tokens: norm(u[1]).split(" ").filter(Boolean) }));
  for (const c of cleaned) if (c.tokens[0]) firstWordCount.set(c.tokens[0], (firstWordCount.get(c.tokens[0]) ?? 0) + 1);
  const add = (alias: string, sym: string) => aliases.set(alias, aliases.has(alias) && aliases.get(alias) !== sym ? null : sym);
  for (const c of cleaned) {
    if (c.tokens.length >= 2) {
      add(c.tokens.join(" "), c.sym);
      add(c.tokens.slice(0, 2).join(" "), c.sym);
    }
    // A bare first word is a brand only if it also starts the ticker ("reliance" ↔ RELIANCE) — this blocks
    // dictionary words that merely open a company name ("great" ↔ GESHIP, "action" ↔ ACE).
    const w = c.tokens[0];
    if (w && w.length >= 5 && !COMMON.has(w) && firstWordCount.get(w) === 1 && w.slice(0, 3) === c.sym.slice(0, 3).toLowerCase()) add(w, c.sym);
  }
  // Drop ambiguous aliases and multi-word aliases made only of generic words ("bank of", "india power").
  const GENERIC = (t: string) => COMMON.has(t) || ["of", "and", "the", "for", "in"].includes(t);
  for (const [a, s] of [...aliases]) if (s === null || a.split(" ").every(GENERIC)) aliases.delete(a);

  return (text: string): string[] => {
    const found = new Set<string>();
    for (const m of text.matchAll(/\$([A-Za-z][A-Za-z&]{1,14})\b/g)) {
      const s = m[1].toUpperCase();
      if (symbols.has(s)) found.add(s);
    }
    for (const m of text.matchAll(/\b[A-Z][A-Z0-9&]{2,14}\b/g)) {
      const s = m[0];
      if (symbols.has(s) && !COMMON.has(s.toLowerCase()) && (s.length >= 4 || SHORT_CAPS_OK.has(s))) found.add(s);
    }
    const toks = norm(text).split(" ");
    for (let i = 0; i < toks.length; i++) {
      for (const n of [3, 2, 1]) {
        if (i + n > toks.length) continue;
        const sym = aliases.get(toks.slice(i, i + n).join(" "));
        if (sym) {
          found.add(sym);
          break;
        }
      }
    }
    return [...found];
  };
}

/* ------------------------------------------------------------------ */
/* Spam / pump filtering                                               */
/* ------------------------------------------------------------------ */

export const textHash = (t: string) => createHash("sha256").update(t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()).digest("hex").slice(0, 24);
export const MAX_POSTS_PER_AUTHOR_TICKER_DAY = 10;
const MIN_FORWARD_ADDED_CHARS = 40;

export type Attributed = Item & { symbols: string[] };

/**
 * Drops: duplicate texts (hash), authors posting > 10 times a day on the same
 * ticker, and Telegram forwards that add no text of their own. Returns kept
 * items plus counts so the run can report what was filtered.
 */
export function filterSpam(items: Attributed[]): { kept: Attributed[]; dropped: { duplicate: number; heavyPoster: number; bareForward: number } } {
  const dropped = { duplicate: 0, heavyPoster: 0, bareForward: 0 };
  const seen = new Set<string>();
  const perAuthor = new Map<string, number>();
  const kept: Attributed[] = [];
  for (const it of items) {
    if (it.forwarded && it.text.trim().length < MIN_FORWARD_ADDED_CHARS) {
      dropped.bareForward++;
      continue;
    }
    const h = `${it.source}:${textHash(it.text)}`;
    if (seen.has(h)) {
      dropped.duplicate++;
      continue;
    }
    seen.add(h);
    if (it.author) {
      const heavy = it.symbols.some((s) => {
        const k = `${it.source}|${it.author}|${s}|${it.day}`;
        const n = (perAuthor.get(k) ?? 0) + 1;
        perAuthor.set(k, n);
        return n > MAX_POSTS_PER_AUTHOR_TICKER_DAY;
      });
      if (heavy) {
        dropped.heavyPoster++;
        continue;
      }
    }
    kept.push(it);
  }
  return { kept, dropped };
}

/* ------------------------------------------------------------------ */
/* Topics + aggregation                                                */
/* ------------------------------------------------------------------ */

const STOP = new Set("the and for are was were that this with from have has had will would could should about into over than then them they their there here what when where which who whom your you our out not but all any can its it's i'm i've don't just like also very more most some such been being does did doing after before again once only own same too both each few other nor off through while because until against between during above below under further both stock stocks share shares market buy sell hold price today tomorrow week month year time going think know people good bad much many really still even well back down one two".split(" "));

/** Top keywords (unigram + bigram) for one ticker-day: aggregate themes only, never quotes. */
export function topTopics(texts: string[], symbol: string, k = 3): string[] {
  const freq = new Map<string, number>();
  const sym = symbol.toLowerCase();
  for (const t of texts) {
    const toks = t.toLowerCase().replace(/https?:\/\/\S+/g, " ").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w) && w !== sym && !/^\d+$/.test(w));
    const seenHere = new Set<string>();
    for (let i = 0; i < toks.length; i++) {
      seenHere.add(toks[i]);
      if (i + 1 < toks.length) seenHere.add(`${toks[i]} ${toks[i + 1]}`);
    }
    for (const g of seenHere) freq.set(g, (freq.get(g) ?? 0) + 1);
  }
  return [...freq.entries()]
    .filter(([, n]) => n >= 2) // a theme needs at least two independent mentions
    .sort((a, b) => b[1] - a[1] || b[0].split(" ").length - a[0].split(" ").length)
    .reduce<string[]>((acc, [g]) => (acc.length >= k || acc.some((a) => a.includes(g) || g.includes(a)) ? acc : [...acc, g]), []);
}

export type Scored = Attributed & { score: number | null }; // −1..+1, null = not scored

export type DailyAggregate = {
  symbol: string;
  day: string;
  source: Source;
  mentions: number;
  sentimentMean: number | null;
  bullishShare: number | null;
  scored: number;
  topics: string[] | null;
};

/** One row per (symbol, day, source). Sentiment fields stay null when nothing was scored. */
export function aggregateDaily(items: Scored[]): DailyAggregate[] {
  const groups = new Map<string, Scored[]>();
  for (const it of items) for (const sym of it.symbols) {
    const k = `${sym}|${it.day}|${it.source}`;
    groups.set(k, [...(groups.get(k) ?? []), it]);
  }
  const out: DailyAggregate[] = [];
  for (const [k, group] of groups) {
    const [symbol, day, source] = k.split("|") as [string, string, Source];
    const scores = group.map((g) => g.score).filter((s): s is number => s !== null);
    const topics = topTopics(group.map((g) => g.text), symbol);
    out.push({
      symbol,
      day,
      source,
      mentions: group.length,
      sentimentMean: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 1000) / 1000 : null,
      bullishShare: scores.length ? Math.round((scores.filter((s) => s > 0.15).length / scores.length) * 1000) / 1000 : null,
      scored: scores.length,
      topics: topics.length ? topics : null,
    });
  }
  return out;
}

/** Map a classifier's label distribution to −1..+1 (works for Bullish/Bearish and positive/negative label sets). */
export function labelsToScore(cands: { label: string; score: number }[]): number | null {
  let pos = 0;
  let neg = 0;
  let known = false;
  for (const c of cands) {
    const l = c.label.toLowerCase();
    if (/bull|positive|^label_2$/.test(l)) {
      pos += c.score;
      known = true;
    } else if (/bear|negative|^label_0$/.test(l)) {
      neg += c.score;
      known = true;
    } else if (/neutral|^label_1$/.test(l)) known = true;
  }
  return known ? Math.round((pos - neg) * 1000) / 1000 : null;
}

/** IST calendar day of a UTC instant. */
export const istDay = (ms: number) => new Date(ms + 5.5 * 3_600_000).toISOString().slice(0, 10);
