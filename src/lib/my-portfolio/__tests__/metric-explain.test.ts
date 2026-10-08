import { describe, expect, it } from "vitest";
import { beta, jensenAlphaOLS, regressionInputs } from "../metrics-spec-engine";
import { alphaTStat, explainMetric } from "../metric-explain";

// Deterministic pseudo-random daily returns: benchmark and a portfolio with beta ~0.6 plus noise.
function series(n: number) {
  let s = 7;
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296 - 0.5);
  const b = Array.from({ length: n }, () => rnd() * 0.02);
  const p = b.map((x) => 0.6 * x + rnd() * 0.006 - 0.0002);
  return { p, b };
}

describe("regressionInputs", () => {
  const { p, b } = series(240);
  const r = regressionInputs(p, b, 0.065)!;

  it("matches the engine's beta and Jensen alpha exactly", () => {
    expect(r.beta).toBeCloseTo(beta(p, b)!, 12);
    expect(r.alphaAnnual).toBeCloseTo(jensenAlphaOLS(p, b, 0.065).alphaDaily * 252, 12);
    expect(r.n).toBe(240);
  });

  it("alpha equals the textbook CAPM form Rp - [Rf + beta(Rm - Rf)]", () => {
    expect(r.alphaAnnual).toBeCloseTo(r.portfolioAnnual - r.capmExpectedAnnual, 10);
  });

  it("beta equals correlation x sigma_p / sigma_m", () => {
    expect(r.beta).toBeCloseTo(r.correlation! * (r.sigmaP / r.sigmaB), 10);
  });

  it("returns null with too little history", () => {
    expect(regressionInputs([0.01, 0.02], [0.01, 0.0], 0.065)).toBeNull();
  });

  it("t-stat is finite", () => expect(Number.isFinite(alphaTStat(r)!)).toBe(true));
});

describe("explainMetric", () => {
  const { p, b } = series(240);
  const reg = regressionInputs(p, b, 0.065);

  it("builds full alpha and beta derivations from real inputs", () => {
    const a = explainMetric("jensensAlpha", { value: "-2.26%", benchmark: "NIFTY 50", regression: reg })!;
    const be = explainMetric("beta", { value: "0.55", benchmark: "NIFTY 50", regression: reg })!;
    expect(a.steps.length).toBeGreaterThanOrEqual(5);
    expect(be.steps.length).toBeGreaterThanOrEqual(4);
    expect(a.symbols.every((s) => s.meaning.length > 0)).toBe(true);
    expect(be.impact.join(" ")).toMatch(/10% fall/);
  });

  it("omits the worked steps (rather than inventing numbers) without history", () => {
    expect(explainMetric("alpha", { value: "—", benchmark: "NIFTY 50", regression: null })!.steps).toEqual([]);
    expect(explainMetric("beta", { value: "—", benchmark: "NIFTY 50" })!.steps).toEqual([]);
  });

  it("explains the other deep metrics and ignores unknown ids", () => {
    for (const id of ["sharpe", "sortino", "treynor", "informationRatio", "var", "trackingError"]) {
      expect(explainMetric(id, { value: "1", benchmark: "NIFTY 50" })!.formula.length).toBeGreaterThan(5);
    }
    expect(explainMetric("nope", { value: "1", benchmark: "x" })).toBeNull();
  });
});
