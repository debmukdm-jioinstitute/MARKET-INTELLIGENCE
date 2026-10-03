/**
 * Smart notifications — deterministic scoring (no ML in v1).
 *
 * importance (0–100) = 0.5 × severity + 0.3 × rarity + 0.2 × breadth
 *   severity: magnitude of the event in rule/σ terms (0–100)
 *   rarity:   how unusual vs the 1-year baseline (z-score mapped to 0–100)
 *   breadth:  how many users plausibly care (0–100)
 *
 * rank(user) = importance × relevance × timeDecay
 * Tiers: critical ≥ 80 (push-worthy), noteworthy 50–79 (bell top), info < 50 (digest).
 */

export const TIER_CRITICAL = 80;
export const TIER_NOTEWORTHY = 50;

export type Tier = "critical" | "noteworthy" | "info";

export function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Map a z-score to 0–100. |z| ≥ 3 → 100, |z| = 0 → 0. */
export function rarityFromZ(z: number): number {
  if (!Number.isFinite(z)) return 50;
  return clamp100((Math.min(Math.abs(z), 3) / 3) * 100);
}

/** First-time-ever occurrences score maximum rarity. */
export function rarityFirstTime(): number {
  return 100;
}

export function importance(severity: number, rarity: number, breadth: number): number {
  return clamp100(0.5 * severity + 0.3 * rarity + 0.2 * breadth);
}

/** Breadth heuristics: macro events and Nifty-50 names reach the most users. */
export function breadthFor(opts: { isMacro?: boolean; isNifty50?: boolean; isIndex?: boolean }): number {
  if (opts.isMacro) return 95;
  if (opts.isIndex) return 85;
  if (opts.isNifty50) return 90;
  return 40;
}

/** Time decay: half-life 12h. A 24h-old event keeps 25% of its rank. */
export function timeDecay(detectedAt: Date | string, now: Date = new Date()): number {
  const at = detectedAt instanceof Date ? detectedAt : new Date(detectedAt);
  const hours = Math.max(0, (now.getTime() - at.getTime()) / 3_600_000);
  return Math.pow(0.5, hours / 12);
}

export function tierOf(importance: number): Tier {
  if (importance >= TIER_CRITICAL) return "critical";
  if (importance >= TIER_NOTEWORTHY) return "noteworthy";
  return "info";
}

export function rankOf(importance: number, relevance: number, detectedAt: Date | string, now?: Date): number {
  const r = (importance / 100) * Math.min(1, Math.max(0, relevance)) * timeDecay(detectedAt, now);
  return Math.round(r * 1000) / 1000;
}

/** Plain-words explainer: why this event scored the way it did. Research framing only — never advice. */
export function explainWhy(args: {
  symbol?: string | null;
  what: string;
  magnitude?: string | null;
  rarityNote?: string | null;
  personalNote?: string | null;
}): string {
  const parts = [args.what];
  if (args.magnitude) parts.push(args.magnitude);
  if (args.rarityNote) parts.push(args.rarityNote);
  if (args.personalNote) parts.push(args.personalNote);
  return parts.filter(Boolean).join(" ");
}
