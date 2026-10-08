/**
 * MI Financial DNA — deterministic rules-based financial strength score.
 *
 * 100% deterministic: no LLM, no randomness, no wall-clock reads. The same
 * input periods always produce the same output.
 *
 * Category weights (tunable):
 *   Growth 20 | Profitability 25 | Cash Quality 20 | Balance Sheet 20 | Capital Efficiency 15
 *
 * When a category cannot be scored it is never zeroed — overall weights are
 * renormalized across the scorable categories. For banks/NBFCs the
 * Balance Sheet category is "not-applicable" (industrial leverage rules do
 * not apply), never zero.
 */
import type {
  CompanyType,
  Metric,
  MetricSource,
  MetricState,
  NormalizedPeriod,
} from "./analytics-types";
import { metric } from "./analytics-types";
import {
  avgCapitalEmployed,
  avgEquity,
  cagr,
  cfoToPat,
  debtToEquity,
  ebitdaMargin,
  fcf,
  fcfMargin,
  interestCoverage,
  mean,
  netDebt,
  netDebtToEbitda,
  normalizeCapex,
  patMargin,
  roce,
  roe,
  safeDiv,
  yoy,
} from "./analytics-math";

/* ------------------------------------------------------------------ */
/* Public contract types                                                */
/* ------------------------------------------------------------------ */

export type DnaCategoryId =
  | "growth"
  | "profitability"
  | "cash-quality"
  | "balance-sheet"
  | "capital-efficiency";

export type DnaCategory = {
  id: DnaCategoryId;
  label: string;
  weight: number;
  score: number | null;
  state: MetricState;
  reasons: string[];
  metrics: { label: string; value: string }[];
};

export type DnaLabel = "Strong" | "Healthy" | "Mixed" | "Weak" | "Poor";

export type FinancialDNA = {
  score: number | null;
  label: DnaLabel | null;
  categories: DnaCategory[];
  disclaimer: string;
  asOf: string;
  source: MetricSource;
};

/* ------------------------------------------------------------------ */
/* Tunable configuration                                                */
/* ------------------------------------------------------------------ */

/** Category weights (percentage points). Renormalized across scorable categories. */
export const DNA_WEIGHTS: Record<DnaCategoryId, number> = {
  growth: 20,
  profitability: 25,
  "cash-quality": 20,
  "balance-sheet": 20,
  "capital-efficiency": 15,
};

/** Overall score -> label mapping, checked top-down (first band with min <= score wins). */
export const DNA_BANDS: { min: number; label: DnaLabel }[] = [
  { min: 85, label: "Strong" },
  { min: 70, label: "Healthy" },
  { min: 55, label: "Mixed" },
  { min: 40, label: "Weak" },
  { min: 0, label: "Poor" },
];

/** Minimum scorable sub-components for a category to receive a score. */
export const DNA_MIN_SCORABLE_SUBS = 2;

export const DNA_DISCLAIMER =
  "A rules-based snapshot of reported financial strength. It is not an investment recommendation.";

/**
 * A threshold band: score of the last entry whose min <= value.
 * Entries must be sorted by min ascending. First entry should have
 * min: Number.NEGATIVE_INFINITY so every value maps to a score.
 */
export type ScoreBand = { min: number; score: number };

/**
 * Tolerance applied in bandScore so an exact-boundary value is not pushed
 * into the lower band by floating-point noise (e.g. a true 20% CAGR
 * computing as 0.19999999999999996). Economically negligible, deterministic.
 */
export const BAND_EPSILON = 1e-9;

/** Map a value onto 0-100 through a threshold table. */
export function bandScore(value: number, bands: ScoreBand[]): number {
  let score = 0;
  for (const band of bands) {
    if (value >= band.min - BAND_EPSILON) score = band.score;
  }
  return score;
}

/** Map an overall 0-100 score to its conservative label. */
export function dnaLabel(score: number): DnaLabel {
  for (const band of DNA_BANDS) {
    if (score >= band.min) return band.label;
  }
  return "Poor";
}

/* ---------------- Growth threshold tables (CAGR as fraction) -------- */

export const GROWTH_CAGR_BANDS: ScoreBand[] = [
  { min: Number.NEGATIVE_INFINITY, score: 20 },
  { min: 0, score: 40 },
  { min: 0.05, score: 55 },
  { min: 0.1, score: 70 },
  { min: 0.15, score: 85 },
  { min: 0.2, score: 100 },
];

/* ---------------- Profitability threshold tables (percent) ---------- */

export const EBITDA_MARGIN_BANDS: ScoreBand[] = [
  { min: Number.NEGATIVE_INFINITY, score: 10 },
  { min: 0, score: 25 },
  { min: 3, score: 40 },
  { min: 8, score: 55 },
  { min: 15, score: 70 },
  { min: 25, score: 85 },
  { min: 40, score: 100 },
];

export const PAT_MARGIN_BANDS: ScoreBand[] = [
  { min: Number.NEGATIVE_INFINITY, score: 10 },
  { min: 0, score: 25 },
  { min: 1, score: 40 },
  { min: 4, score: 55 },
  { min: 8, score: 70 },
  { min: 12, score: 85 },
  { min: 20, score: 100 },
];

export const ROE_BANDS: ScoreBand[] = [
  { min: Number.NEGATIVE_INFINITY, score: 10 },
  { min: 0, score: 25 },
  { min: 4, score: 40 },
  { min: 8, score: 55 },
  { min: 12, score: 70 },
  { min: 18, score: 85 },
  { min: 25, score: 100 },
];

export const ROCE_BANDS: ScoreBand[] = [
  { min: Number.NEGATIVE_INFINITY, score: 10 },
  { min: 0, score: 25 },
  { min: 2, score: 40 },
  { min: 6, score: 55 },
  { min: 10, score: 70 },
  { min: 15, score: 85 },
  { min: 22, score: 100 },
];

/* ---------------- Cash quality threshold tables --------------------- */

export const CFO_PAT_BANDS: ScoreBand[] = [
  { min: Number.NEGATIVE_INFINITY, score: 20 },
  { min: 0.4, score: 35 },
  { min: 0.6, score: 50 },
  { min: 0.8, score: 70 },
  { min: 1.0, score: 85 },
  { min: 1.2, score: 100 },
];

export const FCF_MARGIN_BANDS: ScoreBand[] = [
  { min: Number.NEGATIVE_INFINITY, score: 25 },
  { min: -5, score: 40 },
  { min: 0, score: 55 },
  { min: 4, score: 70 },
  { min: 8, score: 85 },
  { min: 12, score: 100 },
];

/* ---------------- Balance sheet threshold tables -------------------- */

export const NETDEBT_EBITDA_BANDS: ScoreBand[] = [
  { min: Number.NEGATIVE_INFINITY, score: 100 },
  { min: 0, score: 85 },
  { min: 1, score: 65 },
  { min: 2, score: 45 },
  { min: 3, score: 30 },
  { min: 4, score: 15 },
];

export const DEBT_EQUITY_BANDS: ScoreBand[] = [
  { min: Number.NEGATIVE_INFINITY, score: 100 },
  { min: 0.1, score: 85 },
  { min: 0.3, score: 70 },
  { min: 0.6, score: 50 },
  { min: 1.0, score: 35 },
  { min: 1.5, score: 20 },
];

export const INTEREST_COVERAGE_BANDS: ScoreBand[] = [
  { min: Number.NEGATIVE_INFINITY, score: 10 },
  { min: 1, score: 25 },
  { min: 1.5, score: 40 },
  { min: 2.5, score: 55 },
  { min: 4, score: 70 },
  { min: 6, score: 85 },
  { min: 10, score: 100 },
];

export const CURRENT_RATIO_BANDS: ScoreBand[] = [
  { min: Number.NEGATIVE_INFINITY, score: 20 },
  { min: 0.8, score: 35 },
  { min: 1.0, score: 55 },
  { min: 1.2, score: 70 },
  { min: 1.5, score: 85 },
  { min: 2.0, score: 100 },
];

/* ---------------- Capital efficiency threshold tables --------------- */

export const ASSET_TURNOVER_BANDS: ScoreBand[] = [
  { min: Number.NEGATIVE_INFINITY, score: 25 },
  { min: 0.15, score: 40 },
  { min: 0.3, score: 55 },
  { min: 0.5, score: 70 },
  { min: 0.7, score: 85 },
  { min: 1.0, score: 100 },
];

export const FCF_CONVERSION_BANDS: ScoreBand[] = [
  { min: Number.NEGATIVE_INFINITY, score: 10 },
  { min: 0, score: 20 },
  { min: 0.2, score: 35 },
  { min: 0.4, score: 50 },
  { min: 0.6, score: 70 },
  { min: 0.8, score: 85 },
  { min: 1.0, score: 100 },
];

/* ------------------------------------------------------------------ */
/* Internal helpers                                                     */
/* ------------------------------------------------------------------ */

type N = number | null | undefined;

const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const fmtPct = (v: number): string => `${v.toFixed(1)}%`;
const fmtMult = (v: number): string => `${v.toFixed(2)}×`;
const fmtCount = (n: number, total: number): string => `${n} of ${total}`;

type SubScore = {
  weight: number;
  score: number | null;
  reasons: string[];
  metrics: { label: string; value: string }[];
};

const unscoredSub = (weight: number): SubScore => ({
  weight,
  score: null,
  reasons: [],
  metrics: [],
});

/**
 * Build a weighted sub-score from a Metric: band the value when the metric
 * is "ok", otherwise leave the sub-component unscored (never zero).
 */
function subFromMetric(
  weight: number,
  m: Metric,
  bands: ScoreBand[],
  reason: string,
  metricLabel: string,
  formatValue: (v: number) => string,
): SubScore {
  if (m.state !== "ok" || m.value === null) return unscoredSub(weight);
  return {
    weight,
    score: bandScore(m.value, bands),
    reasons: [reason],
    metrics: [{ label: metricLabel, value: formatValue(m.value) }],
  };
}

/** Free cash flow for one period: reported value, else CFO - capex. */
function periodFcf(p: NormalizedPeriod): number | null {
  if (isNum(p.freeCashFlow)) return p.freeCashFlow;
  return fcf(p.cfo, normalizeCapex(p.capex));
}

/** CAGR over the trailing window; null unless enough finite observations. */
function windowCagr(
  values: Array<N>,
  window: number,
  minPoints: number,
): { value: number | null; points: number } {
  const w = values.slice(-window).filter(isNum);
  if (w.length < minPoints) return { value: null, points: w.length };
  return { value: cagr(w), points: w.length };
}

/** Share of year-on-year revenue increases over the whole series. */
function revenueConsistency(revenues: Array<N>): {
  share: number | null;
  positive: number;
  total: number;
} {
  let positive = 0;
  let total = 0;
  for (let i = 1; i < revenues.length; i++) {
    const g = yoy(revenues[i], revenues[i - 1]);
    if (g === null) continue;
    total += 1;
    if (g > 0) positive += 1;
  }
  return {
    share: total >= 2 ? positive / total : null,
    positive,
    total,
  };
}

/** Multi-year average ROE (mean PAT over mean equity). */
function avgRoe(periods: NormalizedPeriod[]): number | null {
  return roe(
    mean(periods.map((p) => p.pat)),
    avgEquity(periods),
  );
}

/** Multi-year average ROCE (mean EBIT over mean capital employed). */
function avgRoce(periods: NormalizedPeriod[]): number | null {
  return roce(
    mean(periods.map((p) => p.ebit)),
    avgCapitalEmployed(periods),
  );
}

function buildCategory(
  id: DnaCategoryId,
  label: string,
  weight: number,
  subs: SubScore[],
): DnaCategory {
  const scored = subs.filter((s) => s.score !== null);
  const reasons = subs.flatMap((s) => s.reasons);
  const metrics = subs.flatMap((s) => s.metrics);
  if (scored.length < DNA_MIN_SCORABLE_SUBS) {
    return {
      id,
      label,
      weight,
      score: null,
      state: "insufficient-history",
      reasons: ["Insufficient reported history to score this category"],
      metrics,
    };
  }
  const weightTotal = scored.reduce((a, s) => a + s.weight, 0);
  const score = Math.round(
    scored.reduce((a, s) => a + (s.score as number) * s.weight, 0) / weightTotal,
  );
  return { id, label, weight, score, state: "ok", reasons, metrics };
}

/* ------------------------------------------------------------------ */
/* Category scorers                                                     */
/* ------------------------------------------------------------------ */

function scoreGrowth(
  periods: NormalizedPeriod[],
  source: MetricSource,
): DnaCategory {
  const revenues = periods.map((p) => p.revenue);
  const pats = periods.map((p) => p.pat);

  const revCagr5 = windowCagr(revenues, 5, 4);
  const revCagr3 = windowCagr(revenues, 3, 3);
  const patCagr5 = windowCagr(pats, 5, 4);
  const patCagr3 = windowCagr(pats, 3, 3);
  const consistency = revenueConsistency(revenues);

  const mk = (
    weight: number,
    c: { value: number | null; points: number },
    kind: "Revenue" | "PAT",
    horizon: string,
  ): SubScore =>
    subFromMetric(
      weight,
      metric(c.value, "ratio", source, `${horizon} ${kind.toLowerCase()} CAGR`),
      GROWTH_CAGR_BANDS,
      c.value === null
        ? ""
        : `${kind} CAGR of ${fmtPct(c.value * 100)} over the last ${c.points} reported years`,
      `${horizon} ${kind.toLowerCase()} CAGR`,
      (v) => fmtPct(v * 100),
    );

  const consistencyMetric = metric(
    consistency.share,
    "ratio",
    source,
    "Share of years with positive revenue growth",
  );
  const consistencySub: SubScore =
    consistencyMetric.state === "ok" && consistencyMetric.value !== null
      ? {
          weight: 10,
          score: Math.round(consistencyMetric.value * 100),
          reasons: [
            consistency.positive === consistency.total
              ? `Revenue grew in every one of the last ${consistency.total} years`
              : `Revenue grew in ${consistency.positive} of the last ${consistency.total} years`,
          ],
          metrics: [
            {
              label: "Positive revenue years",
              value: fmtCount(consistency.positive, consistency.total),
            },
          ],
        }
      : unscoredSub(10);

  return buildCategory("growth", "Growth", DNA_WEIGHTS.growth, [
    mk(30, revCagr5, "Revenue", "5Y"),
    mk(25, revCagr3, "Revenue", "3Y"),
    mk(20, patCagr5, "PAT", "5Y"),
    mk(15, patCagr3, "PAT", "3Y"),
    consistencySub,
  ]);
}

function scoreProfitability(
  periods: NormalizedPeriod[],
  source: MetricSource,
): DnaCategory {
  const obs = periods.slice(-5);
  const n = obs.length;

  const ebitdaMarginAvg = mean(obs.map((p) => ebitdaMargin(p.ebitda, p.revenue)));
  const patMarginAvg = mean(obs.map((p) => patMargin(p.pat, p.revenue)));
  const roeAvg = avgRoe(obs);
  const roceAvg = avgRoce(obs);

  const years = (count: number) => `over the last ${count} reported years`;

  return buildCategory(
    "profitability",
    "Profitability",
    DNA_WEIGHTS.profitability,
    [
      subFromMetric(
        30,
        metric(ebitdaMarginAvg, "pct", source, "Average EBITDA margin"),
        EBITDA_MARGIN_BANDS,
        ebitdaMarginAvg === null
          ? ""
          : `Average EBITDA margin of ${fmtPct(ebitdaMarginAvg)} ${years(n)}`,
        "Avg EBITDA margin",
        fmtPct,
      ),
      subFromMetric(
        25,
        metric(patMarginAvg, "pct", source, "Average PAT margin"),
        PAT_MARGIN_BANDS,
        patMarginAvg === null
          ? ""
          : `Average PAT margin of ${fmtPct(patMarginAvg)} ${years(n)}`,
        "Avg PAT margin",
        fmtPct,
      ),
      subFromMetric(
        25,
        metric(roeAvg, "pct", source, "Average return on equity"),
        ROE_BANDS,
        roeAvg === null ? "" : `Average ROE of ${fmtPct(roeAvg)} ${years(n)}`,
        "Avg ROE",
        fmtPct,
      ),
      subFromMetric(
        20,
        metric(roceAvg, "pct", source, "Average return on capital employed"),
        ROCE_BANDS,
        roceAvg === null ? "" : `Average ROCE of ${fmtPct(roceAvg)} ${years(n)}`,
        "Avg ROCE",
        fmtPct,
      ),
    ],
  );
}

function scoreCashQuality(
  periods: NormalizedPeriod[],
  source: MetricSource,
): DnaCategory {
  const obs = periods.slice(-5);

  const cfoPatRatios = obs.map((p) => cfoToPat(p.cfo, p.pat));
  const cfoPatAvg = mean(cfoPatRatios);
  const cfoBeatsPat = cfoPatRatios.filter((r) => r !== null && r > 1).length;
  const cfoPatYears = cfoPatRatios.filter((r) => r !== null).length;
  const latestCfoPat = cfoPatRatios[cfoPatRatios.length - 1] ?? null;

  const fcfVals = obs.map(periodFcf);
  const fcfFinite = fcfVals.filter(isNum);
  const positiveFcf = fcfFinite.filter((v) => v > 0).length;
  const fcfShare =
    fcfFinite.length >= 2 ? positiveFcf / fcfFinite.length : null;

  const fcfMarginAvg = mean(
    obs.map((p) => fcfMargin(periodFcf(p), p.revenue)),
  );

  const cfoReasons: string[] = [];
  if (cfoPatYears > 0) {
    cfoReasons.push(
      `CFO exceeded PAT in ${cfoBeatsPat} of the last ${cfoPatYears} reported years`,
    );
  }
  if (latestCfoPat !== null) {
    cfoReasons.push(`Current CFO/PAT: ${fmtMult(latestCfoPat)}`);
  }

  const cfoSub: SubScore =
    cfoPatAvg === null
      ? unscoredSub(40)
      : {
          weight: 40,
          score: bandScore(cfoPatAvg, CFO_PAT_BANDS),
          reasons: cfoReasons,
          metrics: [{ label: "Avg CFO/PAT", value: fmtMult(cfoPatAvg) }],
        };

  const fcfSub: SubScore =
    fcfShare === null
      ? unscoredSub(35)
      : {
          weight: 35,
          score: Math.round(fcfShare * 100),
          reasons: [
            `Positive FCF in ${positiveFcf} of the last ${fcfFinite.length} reported years`,
          ],
          metrics: [
            {
              label: "Positive FCF years",
              value: fmtCount(positiveFcf, fcfFinite.length),
            },
          ],
        };

  return buildCategory("cash-quality", "Cash Quality", DNA_WEIGHTS["cash-quality"], [
    cfoSub,
    fcfSub,
    subFromMetric(
      25,
      metric(fcfMarginAvg, "pct", source, "Average FCF margin"),
      FCF_MARGIN_BANDS,
      fcfMarginAvg === null
        ? ""
        : `Average FCF margin of ${fmtPct(fcfMarginAvg)} over the last ${obs.length} reported years`,
      "Avg FCF margin",
      fmtPct,
    ),
  ]);
}

function scoreBalanceSheet(
  periods: NormalizedPeriod[],
  source: MetricSource,
): DnaCategory {
  const latest: NormalizedPeriod | undefined = periods[periods.length - 1];

  // Net debt / EBITDA is only interpretable with positive EBITDA.
  const ndEbitdaVal =
    latest !== undefined && isNum(latest.ebitda) && latest.ebitda > 0
      ? netDebtToEbitda(netDebt(latest.totalDebt, latest.cash), latest.ebitda)
      : null;

  const debtEquityVal =
    latest === undefined ? null : debtToEquity(latest.totalDebt, latest.totalEquity);

  // A company with reported zero interest expense carries no interest burden.
  const interestZero =
    latest !== undefined &&
    isNum(latest.interestExpense) &&
    latest.interestExpense === 0 &&
    isNum(latest.ebit) &&
    latest.ebit > 0;
  const interestCoverageVal = interestZero
    ? null
    : latest === undefined
      ? null
      : interestCoverage(latest.ebit, latest.interestExpense);
  const interestSub: SubScore = interestZero
    ? {
        weight: 25,
        score: 100,
        reasons: ["No interest expense in the latest reported year"],
        metrics: [{ label: "Interest coverage", value: "No interest expense" }],
      }
    : subFromMetric(
        25,
        metric(interestCoverageVal, "multiple", source, "EBIT / interest expense"),
        INTEREST_COVERAGE_BANDS,
        interestCoverageVal === null
          ? ""
          : `Interest covered ${fmtMult(interestCoverageVal)} by EBIT in the latest reported year`,
        "Interest coverage",
        fmtMult,
      );

  const currentRatioVal =
    latest === undefined
      ? null
      : safeDiv(latest.currentAssets, latest.currentLiabilities);

  return buildCategory(
    "balance-sheet",
    "Balance Sheet",
    DNA_WEIGHTS["balance-sheet"],
    [
      subFromMetric(
        35,
        metric(ndEbitdaVal, "multiple", source, "Net debt / EBITDA"),
        NETDEBT_EBITDA_BANDS,
        ndEbitdaVal === null
          ? ""
          : `Net debt is ${fmtMult(ndEbitdaVal)} of EBITDA in the latest reported year`,
        "Net debt / EBITDA",
        fmtMult,
      ),
      subFromMetric(
        25,
        metric(debtEquityVal, "multiple", source, "Debt / equity"),
        DEBT_EQUITY_BANDS,
        debtEquityVal === null
          ? ""
          : `Debt / equity of ${fmtMult(debtEquityVal)} in the latest reported year`,
        "Debt / equity",
        fmtMult,
      ),
      interestSub,
      subFromMetric(
        15,
        metric(currentRatioVal, "multiple", source, "Current assets / current liabilities"),
        CURRENT_RATIO_BANDS,
        currentRatioVal === null
          ? ""
          : `Current ratio of ${fmtMult(currentRatioVal)} in the latest reported year`,
        "Current ratio",
        fmtMult,
      ),
    ],
  );
}

function bankBalanceSheet(): DnaCategory {
  return {
    id: "balance-sheet",
    label: "Balance Sheet",
    weight: DNA_WEIGHTS["balance-sheet"],
    score: null,
    state: "not-applicable",
    reasons: ["Not applicable to banks/NBFCs"],
    metrics: [],
  };
}

function scoreCapitalEfficiency(
  periods: NormalizedPeriod[],
  source: MetricSource,
): DnaCategory {
  const obs = periods.slice(-5);
  const latest: NormalizedPeriod | undefined = periods[periods.length - 1];

  const roceAvg = avgRoce(obs);
  const roeAvg = avgRoe(obs);
  const assetTurnover =
    latest === undefined
      ? null
      : safeDiv(latest.revenue, mean(obs.map((p) => p.totalAssets)));
  const fcfConversionAvg = mean(
    obs.map((p) => {
      const f = periodFcf(p);
      return isNum(f) && isNum(p.pat) && p.pat > 0 ? f / p.pat : null;
    }),
  );

  const years = (count: number) => `over the last ${count} reported years`;

  return buildCategory(
    "capital-efficiency",
    "Capital Efficiency",
    DNA_WEIGHTS["capital-efficiency"],
    [
      subFromMetric(
        30,
        metric(roceAvg, "pct", source, "Average return on capital employed"),
        ROCE_BANDS,
        roceAvg === null ? "" : `Average ROCE of ${fmtPct(roceAvg)} ${years(obs.length)}`,
        "Avg ROCE",
        fmtPct,
      ),
      subFromMetric(
        30,
        metric(roeAvg, "pct", source, "Average return on equity"),
        ROE_BANDS,
        roeAvg === null ? "" : `Average ROE of ${fmtPct(roeAvg)} ${years(obs.length)}`,
        "Avg ROE",
        fmtPct,
      ),
      subFromMetric(
        20,
        metric(assetTurnover, "multiple", source, "Revenue / average total assets"),
        ASSET_TURNOVER_BANDS,
        assetTurnover === null
          ? ""
          : `Asset turnover of ${fmtMult(assetTurnover)} in the latest reported year`,
        "Asset turnover",
        fmtMult,
      ),
      subFromMetric(
        20,
        metric(fcfConversionAvg, "multiple", source, "Average FCF / PAT"),
        FCF_CONVERSION_BANDS,
        fcfConversionAvg === null
          ? ""
          : `Average FCF conversion of ${fmtMult(fcfConversionAvg)} ${years(obs.length)}`,
        "Avg FCF conversion",
        fmtMult,
      ),
    ],
  );
}

/* ------------------------------------------------------------------ */
/* Entry point                                                          */
/* ------------------------------------------------------------------ */

/**
 * Score a company's financial DNA from normalized annual periods
 * (newest last). "unknown" company type is treated as industrial.
 */
export function scoreDNA(
  periods: NormalizedPeriod[],
  companyType: CompanyType,
): FinancialDNA {
  const ordered = [...periods];
  const latest: NormalizedPeriod | undefined = ordered[ordered.length - 1];
  const source: MetricSource = latest?.source ?? {
    provider: "unavailable",
    sourceType: "derived",
  };

  const categories: DnaCategory[] = [
    scoreGrowth(ordered, source),
    scoreProfitability(ordered, source),
    scoreCashQuality(ordered, source),
    companyType === "bank-nbfc" ? bankBalanceSheet() : scoreBalanceSheet(ordered, source),
    scoreCapitalEfficiency(ordered, source),
  ];

  const scorable = categories.filter((c) => c.score !== null);
  let score: number | null = null;
  let label: DnaLabel | null = null;
  if (scorable.length > 0) {
    const weightTotal = scorable.reduce((a, c) => a + c.weight, 0);
    score = Math.round(
      scorable.reduce((a, c) => a + (c.score as number) * c.weight, 0) /
        weightTotal,
    );
    label = dnaLabel(score);
  }

  return {
    score,
    label,
    categories,
    disclaimer: DNA_DISCLAIMER,
    asOf: latest?.label ?? "",
    source,
  };
}


