import { describe, expect, it } from "vitest";
import { bsCall, bsPut, nextThursday, realizedVolAt } from "./option-pricing";

describe("bsCall / bsPut", () => {
  it("matches a known textbook Black-Scholes value (Hull-style example)", () => {
    // spot=100, strike=100, t=1y, sigma=20%, r=5% -> call ~10.45, put ~5.57 (standard reference values)
    const call = bsCall({ spot: 100, strike: 100, t: 1, sigma: 0.2, r: 0.05 });
    const put = bsPut({ spot: 100, strike: 100, t: 1, sigma: 0.2, r: 0.05 });
    expect(call).toBeCloseTo(10.45, 1);
    expect(put).toBeCloseTo(5.57, 1);
  });

  it("satisfies put-call parity: C - P = S - K*e^(-rT)", () => {
    const input = { spot: 24500, strike: 24700, t: 5 / 365, sigma: 0.14, r: 0.065 };
    const c = bsCall(input);
    const p = bsPut(input);
    const parity = input.spot - input.strike * Math.exp(-input.r * input.t);
    expect(c - p).toBeCloseTo(parity, 4);
  });

  it("converges to intrinsic value as time to expiry approaches 0", () => {
    const itmCall = bsCall({ spot: 24700, strike: 24500, t: 1e-8, sigma: 0.14 });
    expect(itmCall).toBeCloseTo(200, 0);
    const otmCall = bsCall({ spot: 24300, strike: 24500, t: 1e-8, sigma: 0.14 });
    expect(otmCall).toBeCloseTo(0, 0);
  });

  it("returns pure intrinsic value for non-positive time or vol instead of NaN", () => {
    expect(bsCall({ spot: 100, strike: 90, t: 0, sigma: 0.2 })).toBe(10);
    expect(bsCall({ spot: 100, strike: 90, t: 1, sigma: 0 })).toBe(10);
    expect(bsPut({ spot: 90, strike: 100, t: 0, sigma: 0.2 })).toBe(10);
  });

  it("call price increases with volatility (all else equal) and stays non-negative", () => {
    const lowVol = bsCall({ spot: 100, strike: 105, t: 0.1, sigma: 0.1 });
    const highVol = bsCall({ spot: 100, strike: 105, t: 0.1, sigma: 0.4 });
    expect(highVol).toBeGreaterThan(lowVol);
    expect(lowVol).toBeGreaterThanOrEqual(0);
  });
});

describe("realizedVolAt", () => {
  it("returns null before a full window of history is available", () => {
    const closes = Array.from({ length: 10 }, (_, i) => 100 + i);
    expect(realizedVolAt(closes, 5, 20)).toBeNull();
  });

  it("is causal: only uses bars up to and including index i, never later ones", () => {
    const base = Array.from({ length: 40 }, (_, i) => 100 * (1 + 0.001 * i));
    const volAt30 = realizedVolAt(base, 30, 20);
    // Mutating everything *after* index 30 must not change the vol computed at 30.
    const mutated = [...base];
    for (let i = 31; i < mutated.length; i++) mutated[i] = mutated[i] * 5;
    expect(realizedVolAt(mutated, 30, 20)).toBe(volAt30);
  });

  it("reports a higher annualized vol for a more volatile return series", () => {
    const calm = Array.from({ length: 30 }, (_, i) => 100 * (1 + 0.0005 * i));
    const wild = Array.from({ length: 30 }, (_, i) => 100 * (1 + 0.03 * Math.sin(i)));
    const volCalm = realizedVolAt(calm, 25, 20)!;
    const volWild = realizedVolAt(wild, 25, 20)!;
    expect(volWild).toBeGreaterThan(volCalm);
  });
});

describe("nextThursday", () => {
  const day = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

  it("returns the following Thursday for a Monday, not the same week twice", () => {
    const monday = day("2026-09-28T09:15:00Z"); // a Monday
    const thu = new Date(nextThursday(monday) * 1000);
    expect(thu.getUTCDay()).toBe(4);
    expect(nextThursday(monday)).toBeGreaterThan(monday);
    expect(nextThursday(monday) - monday).toBeLessThanOrEqual(4 * 86_400 + 1);
  });

  it("rolls over to next week's Thursday when called on a Thursday itself (no zero-day expiry)", () => {
    const thursday = day("2026-10-01T09:15:00Z"); // a Thursday
    const next = nextThursday(thursday);
    expect(next).toBeGreaterThan(thursday);
    expect(next - thursday).toBe(7 * 86_400);
  });
});
