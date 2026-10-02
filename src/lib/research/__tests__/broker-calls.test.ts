import { describe, expect, it } from "vitest";
import { ratingBucket, summarizeBrokerCalls, type BrokerCallRecord } from "@/lib/research/broker-calls";

const call = (action: string, targetPrice: number | null, broker = "B"): BrokerCallRecord => ({ broker, action, targetPrice, reportDate: "2026-09-30", tone: null, sourceUrl: `u-${broker}-${action}-${targetPrice}` });

describe("ratingBucket", () => {
  it("maps actions into five buckets", () => {
    expect(ratingBucket("Strong Buy")).toBe("strong_buy");
    expect(ratingBucket("Buy")).toBe("buy");
    expect(ratingBucket("Outperform")).toBe("buy");
    expect(["Accumulate", "Hold", "Neutral", "Market Perform"].map(ratingBucket)).toEqual(["hold", "hold", "hold", "hold"]);
    expect(ratingBucket("Reduce")).toBe("reduce");
    expect(ratingBucket("Underweight")).toBe("reduce");
    expect(ratingBucket("Sell")).toBe("sell");
    expect(ratingBucket("Underperform")).toBe("sell");
  });
});

describe("summarizeBrokerCalls", () => {
  it("computes median, range and implied upside against a CMP", () => {
    const s = summarizeBrokerCalls([call("Buy", 120), call("Buy", 140, "C"), call("Neutral", 100, "D"), call("Sell", 80, "E")], 100);
    expect(s.count).toBe(4);
    expect(s.distribution).toEqual({ strong_buy: 0, buy: 2, hold: 1, reduce: 0, sell: 1 });
    expect([s.targetMin, s.targetMedian, s.targetMax]).toEqual([80, 110, 140]);
    expect(s.medianImpliedUpsidePct).toBe(10);
    expect(s.calls[0].impliedUpsidePct).toBe(20);
  });
  it("omits upside when there is no CMP and ignores missing targets", () => {
    const s = summarizeBrokerCalls([call("Buy", null), call("Buy", 50, "C")], null);
    expect(s.cmp).toBeNull();
    expect(s.medianImpliedUpsidePct).toBeNull();
    expect(s.calls.every((c) => c.impliedUpsidePct === null)).toBe(true);
    expect(s.targetCount).toBe(1);
    expect(s.targetMedian).toBe(50);
  });
  it("returns an honest empty summary", () => {
    const s = summarizeBrokerCalls([], 100);
    expect(s.count).toBe(0);
    expect(s.targetMedian).toBeNull();
    expect(s.medianImpliedUpsidePct).toBeNull();
  });
});
