/** Shared token / fuzzy helpers for natural-language ticker matching. */

const ALIASES: Record<string, string> = {
  JPPOWER: "JPPOWER",
  "JP POWER": "JPPOWER",
  "J P POWER": "JPPOWER",
  "JAIPRAKASH POWER": "JPPOWER",
  "JAI PRAKASH POWER": "JPPOWER",
  "JAIPRAKASH POWER VENTURES": "JPPOWER",
  RELIANCE: "RELIANCE",
  "RELIANCE INDUSTRIES": "RELIANCE",
  RIL: "RELIANCE",
  TCS: "TCS",
  "TATA CONSULTANCY": "TCS",
  "TATA CONSULTANCY SERVICES": "TCS",
  INFY: "INFY",
  INFOSYS: "INFY",
  HDFCBANK: "HDFCBANK",
  "HDFC BANK": "HDFCBANK",
  ICICIBANK: "ICICIBANK",
  "ICICI BANK": "ICICIBANK",
  SBIN: "SBIN",
  "STATE BANK": "SBIN",
  "STATE BANK OF INDIA": "SBIN",
  "SBI": "SBIN",
  BHARTIARTL: "BHARTIARTL",
  AIRTEL: "BHARTIARTL",
  "BHARTI AIRTEL": "BHARTIARTL",
  HINDUNILVR: "HINDUNILVR",
  HUL: "HINDUNILVR",
  "HINDUSTAN UNILEVER": "HINDUNILVR",
  BAJFINANCE: "BAJFINANCE",
  "BAJAJ FINANCE": "BAJFINANCE",
  TATAMOTORS: "TATAMOTORS",
  "TATA MOTORS": "TATAMOTORS",
  TATAPOWER: "TATAPOWER",
  "TATA POWER": "TATAPOWER",
  ADANIENT: "ADANIENT",
  "ADANI ENTERPRISES": "ADANIENT",
  ADANIPORTS: "ADANIPORTS",
  "ADANI PORTS": "ADANIPORTS",
  LT: "LT",
  "LARSEN": "LT",
  "LARSEN AND TOUBRO": "LT",
  "L&T": "LT",
};

export function normalizeSymbolQuery(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Collapse spaces/punctuation so "JP POWER" matches symbol JPPOWER. */
export function compactToken(raw: string): string {
  return normalizeSymbolQuery(raw).replace(/\s+/g, "");
}

export function aliasSymbol(query: string): string | null {
  const spaced = normalizeSymbolQuery(query);
  const compact = compactToken(query);
  return ALIASES[spaced] ?? ALIASES[compact] ?? null;
}

export function queryTokens(query: string): string[] {
  return normalizeSymbolQuery(query)
    .split(" ")
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

// Corporate-suffix stopwords (never carry search signal) plus English
// grammatical filler that legitimate NSE/US company names essentially never
// contain ("is", "to", "what", "does", ...). Stripping the latter matters
// once a query is a full natural-language sentence that also happens to
// name a real company/ticker ("is it safe to invest in adani", "what is the
// pe ratio of tcs") — without it, `queryTokens` denominator in scoreHit's
// overlap ratio is dominated by words that can never match, so the one
// meaningful token (the company/ticker) can never clear even a low overlap
// threshold. This list is intentionally conservative: no word here is a
// real listed NSE/US company/ticker name on its own.
const STOP = new Set([
  "THE",
  "AND",
  "OF",
  "FOR",
  "LTD",
  "LIMITED",
  "INDIA",
  "INDIAN",
  "CO",
  "COMPANY",
  "CORP",
  "CORPORATION",
  "INC",
  "PLC",
  "IS",
  "IT",
  "TO",
  "IN",
  "AM",
  "ARE",
  "WAS",
  "WERE",
  "BE",
  "BEEN",
  "DO",
  "DOES",
  "DID",
  "CAN",
  "COULD",
  "WOULD",
  "SHOULD",
  "WILL",
  "WHAT",
  "WHY",
  "HOW",
  "WHEN",
  "WHERE",
  "WHO",
  "WHICH",
  "THIS",
  "THAT",
  "THESE",
  "THOSE",
  "MY",
  "YOUR",
  "ME",
  "YOU",
  "ABOUT",
  "WITH",
  "PLEASE",
]);

/**
 * Bounded edit distance; returns Infinity when over maxDist. This is
 * restricted Damerau-Levenshtein: plain Levenshtein plus one adjacent-
 * transposition step (swap of two neighboring characters costs 1, not 2).
 * Ticker typos are disproportionately transpositions — "relaince" for
 * RELIANCE, "hdfcbnak" for HDFCBANK — and plain Levenshtein scores those at
 * distance 2 (a substitution + a substitution, or delete + insert), which is
 * enough to still surface the symbol but not enough to rank it as the
 * confident top hit the task asks for. Signature and return type are
 * unchanged, so every caller (`scoreHit` in `symbol-search.ts` and its
 * tests) keeps working; this only ever *lowers* a distance, never raises
 * one, so it can only improve ranking, never cause a new zero-result case.
 */
export function editDistance(a: string, b: string, maxDist = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > maxDist) return Infinity;
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  // Row i-2, used only for the transposition check below.
  const prev2 = new Array(b.length + 1).fill(Infinity);
  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      // Adjacent transposition, e.g. "relAInce" <-> "relIAnce" — one edit,
      // not two.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2]! + 1);
      }
      cur[j] = v;
      if (v < best) best = v;
    }
    if (best > maxDist) return Infinity;
    for (let j = 0; j <= b.length; j++) {
      prev2[j] = prev[j]!;
      prev[j] = cur[j]!;
    }
  }
  return prev[b.length]!;
}
