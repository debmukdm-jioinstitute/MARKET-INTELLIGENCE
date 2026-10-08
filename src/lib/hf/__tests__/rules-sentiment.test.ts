import { describe, expect, it } from "vitest";
import { scoreTextRules } from "@/lib/hf/rules-sentiment";

describe("rules-sentiment engine", () => {
  it("marks the screenshot's noisy LT headlines honestly", () => {
    // "Up 0.32%" is market noise -> neutral (old engine said BULLISH via substring "up")
    const noisy = scoreTextRules(
      "Larsen & Toubro (NSE: LT) Up 0.32% at ₹3,870.7: EMA 51, RSI and Q1 Numbers",
    );
    expect(noisy.label).toBe("neutral");

    // Price-target forecast pieces carry no directional signal -> neutral
    const forecast = scoreTextRules("LT Forecast — Price Target — Prediction for 2027");
    expect(forecast.label).toBe("neutral");

    const sws = scoreTextRules(
      "Larsen & Toubro (NSE:LT) Stock Forecast & Analyst Predictions - Simply Wall Street",
    );
    expect(sws.label).toBe("neutral");

    // Order-book growth is genuinely positive for an EPC name
    const orderBook = scoreTextRules("Larsen & Toubro (NSE:LT) Order Book Growth and Backlog Outlook");
    expect(orderBook.label).toBe("positive");
    expect(orderBook.signals.join(" ")).toContain("order book");
  });

  it("does not fire substrings inside unrelated words", () => {
    // "up" inside "group", bare "record" inside "record date" must not score
    const r = scoreTextRules("Group announces record date for dividend distribution");
    expect(r.label).toBe("positive"); // dividend is real signal
    expect(r.signals.join(" ")).not.toMatch(/\+1 record\b/);

    const groupOnly = scoreTextRules("Group chief wraps up annual strategy review");
    expect(groupOnly.label).toBe("neutral");
    expect(groupOnly.signals).toEqual([]);
  });

  it("scales explicit percent moves and ignores sub-1% noise", () => {
    const big = scoreTextRules("Shares surge 7% after blockbuster Q3 results");
    expect(big.label).toBe("positive");

    const small = scoreTextRules("Stock up 0.32% in early trade");
    expect(small.label).toBe("neutral");

    const down = scoreTextRules("Shares plunge 8% on weak guidance");
    expect(down.label).toBe("negative");

    const pctFirst = scoreTextRules("Here's what drove the share price higher by 7% in trade");
    expect(pctFirst.label).toBe("positive");
  });

  it("handles negation: negated positives flip, negated negatives neutralise", () => {
    const failedOrder = scoreTextRules("L&T fails to win ₹5,000 crore metro order");
    expect(failedOrder.label).toBe("negative");

    const deniesFraud = scoreTextRules("Company denies fraud allegations in exchange filing");
    expect(deniesFraud.label).toBe("neutral");
    expect(deniesFraud.signals).toEqual([]);

    const misses = scoreTextRules("Q2 misses estimates as margins shrink");
    expect(misses.label).toBe("negative");
  });

  it("scores strong finance signals with calibrated confidence", () => {
    const pw = scoreTextRules("Company issues profit warning, cuts full-year guidance");
    expect(pw.label).toBe("negative");
    expect(pw.score).toBeGreaterThan(0.7);

    const beat = scoreTextRules("Q3 profit beats estimates; board declares record dividend");
    expect(beat.label).toBe("positive");
    expect(beat.score).toBeGreaterThan(0.7);

    const plain = scoreTextRules("Board to consider quarterly results on Friday");
    expect(plain.label).toBe("neutral");
    expect(plain.score).toBeLessThan(0.7);
  });

  it("returns a FinBERT-compatible scores triple", () => {
    const r = scoreTextRules("Broker upgrades stock to buy, raises price target");
    expect(r.engine).toBe("rules");
    expect(r.scores).toHaveLength(3);
    expect(r.scores[0]!.label).toBe(r.label);
    const sum = r.scores.reduce((a, s) => a + s.score, 0);
    expect(sum).toBeCloseTo(1, 5);
    for (let i = 1; i < r.scores.length; i++) {
      expect(r.scores[i - 1]!.score).toBeGreaterThanOrEqual(r.scores[i]!.score);
    }
  });
});
