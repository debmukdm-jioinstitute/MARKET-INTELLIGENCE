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
]);

/** Bounded Levenshtein distance; returns Infinity when over maxDist. */
export function editDistance(a: string, b: string, maxDist = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > maxDist) return Infinity;
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      cur[j] = v;
      if (v < best) best = v;
    }
    if (best > maxDist) return Infinity;
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j]!;
  }
  return prev[b.length]!;
}
