/**
 * Pure aggregation over collected public broker calls. These are the calls we
 * happened to collect — never a market consensus. No figure is invented: with
 * no CMP the implied upside is simply omitted.
 */

export type RatingBucket = "strong_buy" | "buy" | "hold" | "reduce" | "sell";
export const BUCKETS: RatingBucket[] = ["strong_buy", "buy", "hold", "reduce", "sell"];

export type BrokerCallRecord = {
  broker: string;
  action: string;
  targetPrice: number | null;
  reportDate: string;
  tone: string | null;
  sourceUrl: string;
};

export type BrokerCallView = BrokerCallRecord & { bucket: RatingBucket; impliedUpsidePct: number | null };

export type BrokerCallSummary = {
  count: number;
  distribution: Record<RatingBucket, number>;
  targetCount: number;
  targetMedian: number | null;
  targetMin: number | null;
  targetMax: number | null;
  cmp: number | null;
  medianImpliedUpsidePct: number | null;
  calls: BrokerCallView[];
};

/** Strong Buy | Buy | Hold (Accumulate / Hold / Neutral) | Reduce | Sell. */
export function ratingBucket(action: string): RatingBucket {
  const a = action.toLowerCase();
  if (/strong\s*sell|^sell|underperform|negative/.test(a)) return "sell";
  if (/reduce|underweight/.test(a)) return "reduce";
  if (/strong\s*buy/.test(a)) return "strong_buy";
  if (/^buy|outperform|overweight|^add\b|positive/.test(a)) return "buy";
  return "hold"; // accumulate, hold, neutral, market perform, equal weight
}

const median = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const pct = (target: number, cmp: number) => Math.round(((target - cmp) / cmp) * 1000) / 10;

export function summarizeBrokerCalls(rows: BrokerCallRecord[], cmp: number | null): BrokerCallSummary {
  const price = cmp !== null && Number.isFinite(cmp) && cmp > 0 ? cmp : null;
  const distribution = { strong_buy: 0, buy: 0, hold: 0, reduce: 0, sell: 0 } as Record<RatingBucket, number>;
  const calls: BrokerCallView[] = rows.map((r) => {
    const bucket = ratingBucket(r.action);
    distribution[bucket] += 1;
    return { ...r, bucket, impliedUpsidePct: price && r.targetPrice ? pct(r.targetPrice, price) : null };
  });
  const targets = rows.map((r) => r.targetPrice).filter((t): t is number => t !== null && t > 0);
  const med = median(targets);
  return {
    count: rows.length,
    distribution,
    targetCount: targets.length,
    targetMedian: med,
    targetMin: targets.length ? Math.min(...targets) : null,
    targetMax: targets.length ? Math.max(...targets) : null,
    cmp: price,
    medianImpliedUpsidePct: price && med !== null ? pct(med, price) : null,
    calls,
  };
}
