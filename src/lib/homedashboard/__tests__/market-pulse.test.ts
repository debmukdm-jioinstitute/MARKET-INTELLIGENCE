import { describe, expect, it } from "vitest";

describe("homepage market pulse daily change formatting", () => {
  function formatDailyChange(quote?: { value: number | null; change?: number | null; changePct?: number | null }) {
    const change =
      quote?.changePct ??
      (quote?.change != null && quote?.value != null && quote.value !== quote.change
        ? quote.change / (quote.value - quote.change)
        : null);
    const pct = change != null ? change * 100 : null;
    const isPositive = pct != null && pct >= 0.005;
    const formattedPct =
      pct != null ? (Math.abs(pct) < 0.005 ? "0.00" : pct.toFixed(2)) : null;

    if (formattedPct == null) return "Quote unavailable";
    return `${isPositive ? "+" : ""}${formattedPct}% · day change`;
  }

  it("correctly converts Upstox decimal return to percentage points for NIFTY 50", () => {
    // Upstox returned changePct = 0.005967366799051789 (+0.60%)
    const quote = {
      value: 22555.75,
      change: 133.80,
      changePct: 0.005967366799051789,
    };
    expect(formatDailyChange(quote)).toBe("+0.60% · day change");
  });

  it("correctly converts Upstox decimal return to percentage points for SENSEX", () => {
    // Upstox returned changePct = 0.006574495513122765 (+0.66%)
    const quote = {
      value: 72382.47,
      change: 472.77,
      changePct: 0.006574495513122765,
    };
    expect(formatDailyChange(quote)).toBe("+0.66% · day change");
  });

  it("correctly converts Upstox decimal return to percentage points for BANK NIFTY", () => {
    // Upstox returned changePct = 0.004836480672901632 (+0.48%)
    const quote = {
      value: 54714.10,
      change: 263.35,
      changePct: 0.004836480672901632,
    };
    expect(formatDailyChange(quote)).toBe("+0.48% · day change");
  });

  it("correctly converts Upstox decimal return to percentage points for INDIA VIX", () => {
    // Upstox returned changePct = 0.02213001383125854 (+2.21%)
    const quote = {
      value: 14.78,
      change: 0.32,
      changePct: 0.02213001383125854,
    };
    expect(formatDailyChange(quote)).toBe("+2.21% · day change");
  });

  it("handles negative market movements cleanly with minus sign", () => {
    const quote = {
      value: 22100.00,
      change: -172.50,
      changePct: -0.007745,
    };
    expect(formatDailyChange(quote)).toBe("-0.77% · day change");
  });

  it("derives changePct from value and change when changePct is missing", () => {
    const quote = {
      value: 100,
      change: 2,
    };
    // prev close = 98, change / prev = 2 / 98 = +2.04%
    expect(formatDailyChange(quote)).toBe("+2.04% · day change");
  });

  it("handles unavailable quote safely", () => {
    expect(formatDailyChange(undefined)).toBe("Quote unavailable");
    expect(formatDailyChange({ value: null })).toBe("Quote unavailable");
  });
});
