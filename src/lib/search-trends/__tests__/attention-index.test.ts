import { describe, expect, it } from "vitest";
import { computeAttentionMetrics } from "@/lib/search-trends/attention-index";

describe("computeAttentionMetrics", () => {
  it("marks surging when latest week jumps vs prior average", () => {
    const timeline = [
      { date: "2026-06-01", value: 20 },
      { date: "2026-06-08", value: 22 },
      { date: "2026-06-15", value: 21 },
      { date: "2026-06-22", value: 19 },
      { date: "2026-06-29", value: 55 },
    ];
    const m = computeAttentionMetrics(timeline);
    expect(m.trendLabel).toBe("surging");
    expect(m.attentionIndex).toBeGreaterThan(40);
  });

  it("returns stable when flat", () => {
    const timeline = Array.from({ length: 6 }, (_, i) => ({
      date: `2026-0${i + 1}-01`,
      value: 40,
    }));
    const m = computeAttentionMetrics(timeline);
    expect(m.trendLabel).toBe("stable");
    expect(m.momentumPct).toBe(0);
  });
});
