import type { TrendPoint } from "@/lib/search-trends/types";

export function computeAttentionMetrics(timeline: TrendPoint[]): {
  currentInterest: number;
  priorAvg: number;
  momentumPct: number;
  attentionIndex: number;
  trendLabel: "surging" | "rising" | "stable" | "cooling" | "fading";
} {
  if (timeline.length === 0) {
    return {
      currentInterest: 0,
      priorAvg: 0,
      momentumPct: 0,
      attentionIndex: 0,
      trendLabel: "stable",
    };
  }

  const values = timeline.map((p) => p.value);
  const currentInterest = values[values.length - 1] ?? 0;
  const priorSlice = values.slice(Math.max(0, values.length - 5), -1);
  const priorAvg =
    priorSlice.length > 0 ? priorSlice.reduce((a, b) => a + b, 0) / priorSlice.length : currentInterest;
  const momentumPct = priorAvg > 0 ? ((currentInterest - priorAvg) / priorAvg) * 100 : 0;

  const momentumBoost = Math.max(-25, Math.min(25, momentumPct * 0.35));
  const attentionIndex = Math.round(Math.min(100, Math.max(0, currentInterest * 0.72 + (50 + momentumBoost) * 0.28)));

  let trendLabel: "surging" | "rising" | "stable" | "cooling" | "fading" = "stable";
  if (momentumPct >= 25) trendLabel = "surging";
  else if (momentumPct >= 8) trendLabel = "rising";
  else if (momentumPct <= -25) trendLabel = "fading";
  else if (momentumPct <= -8) trendLabel = "cooling";

  return { currentInterest, priorAvg, momentumPct, attentionIndex, trendLabel };
}
