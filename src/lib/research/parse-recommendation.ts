/**
 * Parse unstructured broker reco headlines (ET / LiveMint) into structured fields
 * so users can judge basis, horizon, and later accuracy — not just follow the call.
 */

export type RecoRating =
  | "buy"
  | "sell"
  | "hold"
  | "accumulate"
  | "reduce"
  | "overweight"
  | "underweight"
  | "neutral"
  | "unrated";

export type ParsedRecommendation = {
  rating: RecoRating;
  symbolHint: string | null;
  companyHint: string | null;
  targetPrice: number | null;
  horizon: string | null;
  /** Days used for outcome scoring when horizon is parsed or defaulted. */
  horizonDays: number;
  basis: string | null;
};

const RATING_PATTERNS: { rating: RecoRating; re: RegExp }[] = [
  { rating: "overweight", re: /\bover-?\s*weight\b/i },
  { rating: "underweight", re: /\bunder-?\s*weight\b/i },
  { rating: "accumulate", re: /\baccumulat(?:e|ion)\b/i },
  { rating: "reduce", re: /\breduc(?:e|tion)\b/i },
  { rating: "buy", re: /\b(?:strong\s+)?buy\b/i },
  { rating: "sell", re: /\b(?:strong\s+)?sell\b/i },
  { rating: "hold", re: /\bhold\b/i },
  { rating: "neutral", re: /\bneutral\b/i },
];

const HORIZON_DEFAULT_DAYS = 90;

function parseHorizon(text: string): { label: string; days: number } | null {
  const m = text.match(
    /(\d+)\s*[-–]?\s*(?:month|months|mth|mths)\b|\b(12|6|3)\s*[-–]?\s*m(?:onth)?s?\b|\bfor\s+(\d+)\s*months?\b|\b(\d+)\s*[-–]?\s*weeks?\b|\b(\d+)\s*[-–]?\s*days?\b/i,
  );
  if (!m) {
    if (/\bshort[- ]term\b/i.test(text)) return { label: "short-term (~3M)", days: 90 };
    if (/\bmedium[- ]term\b/i.test(text)) return { label: "medium-term (~6M)", days: 180 };
    if (/\blong[- ]term\b/i.test(text)) return { label: "long-term (~12M)", days: 365 };
    if (/\btarget\b/i.test(text)) return { label: "implied ~3M (headline default)", days: HORIZON_DEFAULT_DAYS };
    return null;
  }
  if (m[5]) return { label: `${m[5]} days`, days: Number(m[5]) };
  if (m[4]) return { label: `${m[4]} weeks`, days: Number(m[4]) * 7 };
  const months = Number(m[1] || m[2] || m[3]);
  if (Number.isFinite(months) && months > 0) return { label: `${months} months`, days: Math.round(months * 30) };
  return null;
}

function parseTarget(text: string): number | null {
  const m =
    text.match(
      /(?:target(?:\s+price)?|tp|tgt)\s*(?:of|at|:)?\s*(?:rs\.?|₹|inr)?\s*([0-9]{1,3}(?:,[0-9]{2,3})+|[0-9]{2,7}(?:\.\d+)?)/i,
    ) ||
    text.match(
      /(?:rs\.?|₹)\s*([0-9]{1,3}(?:,[0-9]{2,3})+|[0-9]{2,7}(?:\.\d+)?)\s*(?:target|tp)\b/i,
    );
  if (!m) return null;
  const n = Number(m[1]!.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 && n < 1_000_000 ? n : null;
}

function parseCompanyHint(title: string, rating: RecoRating): string | null {
  // Common patterns: "Buy Reliance Industries; target..." / "HDFC Bank recommended..."
  const cleaned = title
    .replace(/\b(?:buy|sell|hold|accumulate|reduce|overweight|underweight|neutral|strong)\b/gi, " ")
    .replace(/\b(?:target|tp|tgt|rs\.?|₹|inr)\b[\s\S]*/i, " ")
    .replace(/\b(?:for|with|says|said|maintains|upgrades?|downgrades?)\b[\s\S]*/i, " ")
    .replace(/[:;|–—-].*$/, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length < 2 || cleaned.length > 80) return null;
  // Drop leading rating leftovers
  if (rating !== "unrated" && cleaned.toLowerCase() === String(rating)) return null;
  return cleaned;
}

function parseBasis(title: string, summary: string | null): string | null {
  const blob = `${title}. ${summary ?? ""}`.trim();
  const cues: { label: string; re: RegExp }[] = [
    { label: "Valuation / target price", re: /\b(?:target|valuation|pe\b|pb\b|multiple)\b/i },
    { label: "Earnings / guidance", re: /\b(?:earnings|pat|revenue|guidance|results|q[1-4])\b/i },
    { label: "Upgrade / downgrade", re: /\b(?:upgrade|downgrade|reiterate|maintain)\b/i },
    { label: "Sector / macro view", re: /\b(?:sector|macro|rate|margin|demand)\b/i },
    { label: "Technical / momentum", re: /\b(?:technical|breakout|support|resistance|momentum)\b/i },
  ];
  const hits = cues.filter((c) => c.re.test(blob)).map((c) => c.label);
  if (hits.length) return hits.slice(0, 2).join("; ");
  if (summary && summary.length > 20) return summary.slice(0, 140).trim();
  return "Headline recommendation (full thesis in linked report)";
}

export function parseRecommendation(title: string, summary?: string | null): ParsedRecommendation {
  const text = `${title} ${summary ?? ""}`;
  let rating: RecoRating = "unrated";
  for (const p of RATING_PATTERNS) {
    if (p.re.test(title) || p.re.test(text)) {
      rating = p.rating;
      break;
    }
  }
  const horizon = parseHorizon(text);
  const companyHint = parseCompanyHint(title, rating);
  return {
    rating,
    symbolHint: null,
    companyHint,
    targetPrice: parseTarget(text),
    horizon: horizon?.label ?? "implied ~3M (headline default)",
    horizonDays: horizon?.days ?? HORIZON_DEFAULT_DAYS,
    basis: parseBasis(title, summary ?? null),
  };
}

export function isBullishRating(rating: RecoRating): boolean {
  return rating === "buy" || rating === "accumulate" || rating === "overweight";
}

export function isBearishRating(rating: RecoRating): boolean {
  return rating === "sell" || rating === "reduce" || rating === "underweight";
}
