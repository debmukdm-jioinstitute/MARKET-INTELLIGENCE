/**
 * Tests for the MI Financial DNA scoring engine (src/lib/research/financial-dna.ts).
 */
import { describe, expect, it } from "vitest";
import type { MetricSource, NormalizedPeriod } from "../analytics-types";
import {
  DNA_BANDS,
  DNA_WEIGHTS,
  GROWTH_CAGR_BANDS,
  bandScore,
  dnaLabel,
  scoreDNA,
} from "../financial-dna";

const SRC: MetricSource = {
  provider: "test-fixture",
  sourceType: "company_filing",
};

const BASE: NormalizedPeriod = {
  key: "",
  label: "",
  endDate: "",
  revenue: null,
  grossProfit: null,
  ebitda: null,
  ebit: null,
  pbt: null,
  pat: null,
  eps: null,
  cfo: null,
  capex: null,
  freeCashFlow: null,
  totalAssets: null,
  totalEquity: null,
  totalDebt: null,
  cash: null,
  currentAssets: null,
  currentLiabilities: null,
  inventory: null,
  receivables: null,
  payables: null,
  interestExpense: null,
  sharesOutstanding: null,
  otherIncome: null,
  cogs: null,
  source: SRC,
};

/** Build periods newest-last from per-year partial rows. */
function makePeriods(rows: Array<Partial<NormalizedPeriod>>): NormalizedPeriod[] {
  return rows.map((row, i) => ({
    ...BASE,
    key: `FY${22 + i}`,
    label: `FY${22 + i}`,
    endDate: `20${22 + i}-03-31`,
    ...row,
  }));
}

/* A textbook strong industrial: 20%/yr revenue growth, 30%/yr PAT growth,
   30% EBITDA margins, CFO at 1.2x PAT, net cash, 2x current ratio. */
const STRONG_ROWS: Array<Partial<NormalizedPeriod>> = (() => {
  const revs = [100, 120, 144, 172.8, 207.36];
  const pats = [20, 26, 33.8, 43.94, 57.121];
  return revs.map((revenue, i) => {
    const pat = pats[i] as number;
    return {
      revenue,
      pat,
      ebitda: revenue * 0.3,
      ebit: revenue * 0.3,
      cfo: pat * 1.2,
      capex: 5,
      totalEquity: 200,
      totalDebt: 20,
      cash: 50,
      interestExpense: 2,
      currentAssets: 80,
      currentLiabilities: 40,
      totalAssets: 260,
    };
  });
})();

/* A textbook weak industrial: shrinking revenue, negative margins and
   cash flows, heavy leverage, weak liquidity. */
const WEAK_ROWS: Array<Partial<NormalizedPeriod>> = (() => {
  const revs = [200, 180, 160, 140, 120];
  const pats = [5, -2, -6, -8, -10];
  const ebitdas = [-10, -12, -14, -16, -18];
  const cfos = [-5, -8, -10, -12, -15];
  return revs.map((revenue, i) => ({
    revenue,
    pat: pats[i],
    ebitda: ebitdas[i],
    ebit: ebitdas[i],
    cfo: cfos[i],
    capex: 5,
    totalEquity: 100,
    totalDebt: 500,
    cash: 20,
    interestExpense: 30,
    currentAssets: 30,
    currentLiabilities: 60,
    totalAssets: 300,
  }));
})();

const strongPeriods = () => makePeriods(STRONG_ROWS);
const weakPeriods = () => makePeriods(WEAK_ROWS);

describe("dnaLabel", () => {
  it("maps boundary scores to conservative labels", () => {
    expect(dnaLabel(100)).toBe("Strong");
    expect(dnaLabel(85)).toBe("Strong");
    expect(dnaLabel(84)).toBe("Healthy");
    expect(dnaLabel(70)).toBe("Healthy");
    expect(dnaLabel(69)).toBe("Mixed");
    expect(dnaLabel(55)).toBe("Mixed");
    expect(dnaLabel(54)).toBe("Weak");
    expect(dnaLabel(40)).toBe("Weak");
    expect(dnaLabel(39)).toBe("Poor");
    expect(dnaLabel(0)).toBe("Poor");
  });

  it("DNA_BANDS covers the 0-100 range top-down", () => {
    expect(DNA_BANDS[0]).toEqual({ min: 85, label: "Strong" });
    expect(DNA_BANDS[DNA_BANDS.length - 1]).toEqual({ min: 0, label: "Poor" });
  });
});

describe("bandScore with GROWTH_CAGR_BANDS", () => {
  it("hits every band boundary from the spec", () => {
    expect(bandScore(0.2, GROWTH_CAGR_BANDS)).toBe(100);
    expect(bandScore(0.1999, GROWTH_CAGR_BANDS)).toBe(85);
    expect(bandScore(0.15, GROWTH_CAGR_BANDS)).toBe(85);
    expect(bandScore(0.1499, GROWTH_CAGR_BANDS)).toBe(70);
    expect(bandScore(0.1, GROWTH_CAGR_BANDS)).toBe(70);
    expect(bandScore(0.0999, GROWTH_CAGR_BANDS)).toBe(55);
    expect(bandScore(0.05, GROWTH_CAGR_BANDS)).toBe(55);
    expect(bandScore(0.0499, GROWTH_CAGR_BANDS)).toBe(40);
    expect(bandScore(0, GROWTH_CAGR_BANDS)).toBe(40);
    expect(bandScore(-0.001, GROWTH_CAGR_BANDS)).toBe(20);
    expect(bandScore(-0.5, GROWTH_CAGR_BANDS)).toBe(20);
  });
});

describe("scoreDNA end-to-end", () => {
  it("scores a strong company Strong with all categories ok", () => {
    const dna = scoreDNA(strongPeriods(), "industrial");
    expect(dna.label).toBe("Strong");
    expect(dna.score).toBeGreaterThanOrEqual(85);
    expect(dna.score).toBeLessThanOrEqual(100);
    expect(Number.isInteger(dna.score)).toBe(true);
    for (const cat of dna.categories) {
      expect(cat.state).toBe("ok");
      expect(cat.score).not.toBeNull();
    }
    const growth = dna.categories.find((c) => c.id === "growth");
    expect(growth?.score).toBe(100);
    const cash = dna.categories.find((c) => c.id === "cash-quality");
    expect(cash?.score).toBe(100);
    expect(
      cash?.reasons.some((r) => r.includes("CFO exceeded PAT in 5 of the last 5")),
    ).toBe(true);
    expect(
      cash?.reasons.some((r) => r.startsWith("Current CFO/PAT:")),
    ).toBe(true);
    expect(
      cash?.metrics.some((m) => m.label === "5Y revenue CAGR" || m.label === "Avg CFO/PAT"),
    ).toBe(true);
    expect(dna.asOf).toBe("FY26");
    expect(dna.source.provider).toBe("test-fixture");
    expect(dna.disclaimer).toBe(
      "A rules-based snapshot of reported financial strength. It is not an investment recommendation.",
    );
  });

  it("scores a weak company Poor", () => {
    const dna = scoreDNA(weakPeriods(), "industrial");
    expect(dna.label).toBe("Poor");
    expect(dna.score).not.toBeNull();
    expect(dna.score as number).toBeLessThanOrEqual(39);
  });

  it("treats unknown company type as industrial", () => {
    const dna = scoreDNA(strongPeriods(), "unknown");
    const bs = dna.categories.find((c) => c.id === "balance-sheet");
    expect(bs?.state).toBe("ok");
    expect(bs?.score).not.toBeNull();
  });

  it("is deterministic across repeat calls", () => {
    const a = JSON.stringify(scoreDNA(strongPeriods(), "industrial"));
    const b = JSON.stringify(scoreDNA(strongPeriods(), "industrial"));
    expect(a).toBe(b);
    const c = JSON.stringify(scoreDNA(weakPeriods(), "bank-nbfc"));
    const d = JSON.stringify(scoreDNA(weakPeriods(), "bank-nbfc"));
    expect(c).toBe(d);
  });

  it("uses the configured weights", () => {
    expect(DNA_WEIGHTS).toEqual({
      growth: 20,
      profitability: 25,
      "cash-quality": 20,
      "balance-sheet": 20,
      "capital-efficiency": 15,
    });
    const total = Object.values(DNA_WEIGHTS).reduce((x, w) => x + w, 0);
    expect(total).toBe(100);
  });
});

describe("renormalization", () => {
  const stripBalanceSheet = (p: NormalizedPeriod): NormalizedPeriod => ({
    ...p,
    totalDebt: null,
    cash: null,
    interestExpense: null,
    currentAssets: null,
    currentLiabilities: null,
  });

  it("redistributes weights when a category is unscorable", () => {
    const dna = scoreDNA(strongPeriods().map(stripBalanceSheet), "industrial");
    const bs = dna.categories.find((c) => c.id === "balance-sheet");
    expect(bs?.score).toBeNull();
    expect(bs?.state).toBe("insufficient-history");
    expect(bs?.reasons).toEqual([
      "Insufficient reported history to score this category",
    ]);

    // Overall still a whole number in 0-100, redistributed across the
    // remaining four categories.
    expect(dna.score).not.toBeNull();
    expect(dna.score as number).toBeGreaterThanOrEqual(0);
    expect(dna.score as number).toBeLessThanOrEqual(100);

    const others = dna.categories.filter((c) => c.id !== "balance-sheet");
    const expected = Math.round(
      others.reduce((a, c) => a + (c.score as number) * c.weight, 0) /
        others.reduce((a, c) => a + c.weight, 0),
    );
    expect(dna.score).toBe(expected);
    expect(dna.label).toBe("Strong");
  });
});

describe("unscorable input", () => {
  it("returns null score and insufficient-history states, never zero", () => {
    const dna = scoreDNA([], "industrial");
    expect(dna.score).toBeNull();
    expect(dna.label).toBeNull();
    for (const cat of dna.categories) {
      expect(cat.score).toBeNull();
      expect(cat.score).not.toBe(0);
      expect(cat.state).toBe("insufficient-history");
      expect(cat.reasons).toEqual([
        "Insufficient reported history to score this category",
      ]);
    }
    expect(dna.asOf).toBe("");
  });

  it("marks a single-period company unscorable (not enough history)", () => {
    const dna = scoreDNA(strongPeriods().slice(-1), "industrial");
    // One year cannot produce CAGRs or consistency streaks: growth must not score.
    const growth = dna.categories.find((c) => c.id === "growth");
    expect(growth?.score).toBeNull();
    expect(growth?.state).toBe("insufficient-history");
  });
});

describe("bank-nbfc handling", () => {
  it("marks balance sheet not-applicable, never zero", () => {
    const dna = scoreDNA(strongPeriods(), "bank-nbfc");
    const bs = dna.categories.find((c) => c.id === "balance-sheet");
    expect(bs?.score).toBeNull();
    expect(bs?.score).not.toBe(0);
    expect(bs?.state).toBe("not-applicable");
    expect(bs?.reasons).toEqual(["Not applicable to banks/NBFCs"]);

    // Overall still scores from the other four categories.
    expect(dna.score).not.toBeNull();
    expect(dna.label).not.toBeNull();
    const others = dna.categories.filter((c) => c.id !== "balance-sheet");
    const expected = Math.round(
      others.reduce((a, c) => a + (c.score as number) * c.weight, 0) /
        others.reduce((a, c) => a + c.weight, 0),
    );
    expect(dna.score).toBe(expected);
  });
});
