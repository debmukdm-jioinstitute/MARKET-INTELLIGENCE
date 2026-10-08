/**
 * Historical Valuation Bands engine (Feature 4 of the research Phase 1 spec,
 * sections 4A-4I).
 *
 * Builds date-aligned valuation observations from reported fundamentals and
 * historical market prices, then summarizes each multiple's own history with
 * medians, quartile bands and current percentile placement.
 *
 * NO LOOK-AHEAD BIAS, ever:
 * - One observation per annual NormalizedPeriod, at its endDate (spec 4B:
 *   Phase 1 uses financial-reporting dates). At a fiscal year end the TTM
 *   values equal the reported annual values exactly.
 * - Each observation uses ONLY that period's own reported fields. A later
 *   period's restated numbers can never leak into an earlier observation.
 * - The market price is the candle close with the latest date on or before
 *   the observation date, never a later close.
 */
import { maxVal, minVal, percentile } from "./analytics-math";
import type {
  CompanyType,
  MetricSource,
  NormalizedPeriod,
} from "./analytics-types";

export type ValuationPoint = {
  date: string;
  pe: number | null;
  pb: number | null;
  evEbitda: number | null;
  evSales: number | null;
  fcfYield: number | null;
};

export type ValuationStats = {
  current: number | null;
  p25: number | null;
  median: number | null;
  p75: number | null;
  min: number | null;
  max: number | null;
  percentile: number | null;
  count: number;
  insufficient: boolean;
};

export type ValuationMultiple = {
  id: "pe" | "pb" | "ev-ebitda" | "ev-sales" | "fcf-yield";
  label: string;
  points: ValuationPoint[];
  stats: Record<"1Y" | "3Y" | "5Y" | "10Y", ValuationStats>;
};

export type ValuationHistory = {
  multiples: ValuationMultiple[];
  asOf: string;
  source: MetricSource;
  notes: string[];
};

type Candle = { date: string; close: number };

/** Spec 4I: minimum valid observations for a multi-year distribution. */
const MIN_OBSERVATIONS = 8;

const WINDOWS = [
  { id: "1Y", years: 1 },
  { id: "3Y", years: 3 },
  { id: "5Y", years: 5 },
  { id: "10Y", years: 10 },
] as const;

type WindowId = (typeof WINDOWS)[number]["id"];

type MultipleKey = "pe" | "pb" | "evEbitda" | "evSales" | "fcfYield";

const MULTIPLE_DEFS: ReadonlyArray<{
  id: ValuationMultiple["id"];
  label: string;
  key: MultipleKey;
}> = [
  { id: "pe", label: "P/E", key: "pe" },
  { id: "pb", label: "P/B", key: "pb" },
  { id: "ev-ebitda", label: "EV/EBITDA", key: "evEbitda" },
  { id: "ev-sales", label: "EV/Sales", key: "evSales" },
  { id: "fcf-yield", label: "FCF Yield", key: "fcfYield" },
];

const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const byDate = <T extends { date: string }>(a: T, b: T): number =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : 0;

const byEndDate = (a: NormalizedPeriod, b: NormalizedPeriod): number =>
  a.endDate < b.endDate ? -1 : a.endDate > b.endDate ? 1 : 0;

/**
 * Latest candle close on or before the observation date.
 * Requires candles sorted ascending by date (sorted defensively in the
 * builder). Returns null when no candle exists on or before that date, in
 * which case the observation is skipped rather than fabricated.
 */
function priceOnOrBefore(obsDate: string, candles: Candle[]): number | null {
  let price: number | null = null;
  for (const c of candles) {
    if (c.date > obsDate) break;
    if (finite(c.close)) price = c.close;
  }
  return price;
}

type ObservationNoteFlags = {
  negativeEps: boolean;
  nonPositiveEquity: boolean;
  missingEvInputs: boolean;
};

/**
 * Build one observation from a single period and its as-of price.
 * Every input comes from `period` (that period's own reported values) and
 * `price` (the market as known on the observation date). Nothing is borrowed
 * from any other period.
 */
function buildPoint(
  period: NormalizedPeriod,
  price: number,
  flags: ObservationNoteFlags,
): ValuationPoint {
  const marketCap =
    finite(period.sharesOutstanding) && price > 0
      ? price * period.sharesOutstanding
      : null;

  // Spec 4B: never show negative P/E; non-positive earnings -> omitted.
  const pe =
    finite(period.eps) && period.eps > 0 ? price / period.eps : null;
  if (finite(period.eps) && period.eps <= 0) flags.negativeEps = true;

  // Spec 4C: price / book, using that period's reported book value of equity.
  const pb =
    marketCap !== null && finite(period.totalEquity) && period.totalEquity > 0
      ? marketCap / period.totalEquity
      : null;
  if (finite(period.totalEquity) && period.totalEquity <= 0)
    flags.nonPositiveEquity = true;

  // Spec 4D/4E: EV = market cap + total debt - cash, from this period only.
  const ev =
    marketCap !== null &&
    finite(period.totalDebt) &&
    finite(period.cash)
      ? marketCap + period.totalDebt - period.cash
      : null;
  if (ev === null && (marketCap === null || !finite(period.totalDebt) || !finite(period.cash)))
    flags.missingEvInputs = true;

  const evEbitda =
    ev !== null && finite(period.ebitda) && period.ebitda > 0
      ? ev / period.ebitda
      : null;

  const evSales =
    ev !== null && finite(period.revenue) && period.revenue > 0
      ? ev / period.revenue
      : null;

  // Spec 4F: TTM (== reported annual at FY end) free cash flow / market cap.
  // Expressed as a fraction of market cap; multiply by 100 for percent.
  const fcfYield =
    marketCap !== null &&
    marketCap > 0 &&
    finite(period.freeCashFlow)
      ? period.freeCashFlow / marketCap
      : null;

  return { date: period.endDate, pe, pb, evEbitda, evSales, fcfYield };
}

/** ISO date of (asOf minus N years), for window membership tests. */
function windowCutoff(asOf: string, years: number): string {
  const d = new Date(`${asOf}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

/** Empty stats used when the window lacks the minimum valid observations. */
function insufficientStats(count: number): ValuationStats {
  return {
    current: null,
    p25: null,
    median: null,
    p75: null,
    min: null,
    max: null,
    percentile: null,
    count,
    insufficient: true,
  };
}

function statsFor(values: number[], current: number | null): ValuationStats {
  if (values.length < MIN_OBSERVATIONS) return insufficientStats(values.length);
  const pct =
    current !== null && finite(current)
      ? (values.filter((v) => v <= current).length / values.length) * 100
      : null;
  return {
    current,
    p25: percentile(values, 25),
    median: percentile(values, 50),
    p75: percentile(values, 75),
    min: minVal(values),
    max: maxVal(values),
    percentile: pct,
    count: values.length,
    insufficient: false,
  };
}

function buildMultiple(
  def: (typeof MULTIPLE_DEFS)[number],
  points: ValuationPoint[],
  asOf: string,
): ValuationMultiple | null {
  const series = points
    .filter((p) => p[def.key] !== null)
    .map((p) => ({ date: p.date, value: p[def.key] as number }));
  if (series.length === 0) return null; // spec: omit multiples with zero valid points
  const current = series[series.length - 1]?.value ?? null;
  const stats = {} as ValuationMultiple["stats"];
  for (const w of WINDOWS) {
    const cutoff = windowCutoff(asOf, w.years);
    const inWindow = series
      .filter((s) => s.date >= cutoff && s.date <= asOf)
      .map((s) => s.value);
    stats[w.id as WindowId] = statsFor(inWindow, current);
  }
  return { id: def.id, label: def.label, points, stats };
}

export function buildValuationHistory(
  periods: NormalizedPeriod[],
  candles: { date: string; close: number }[],
  companyType: CompanyType,
): ValuationHistory {
  const source: MetricSource = {
    provider: "Yahoo Finance",
    sourceType: "market_data",
    inputs: ["company_filing"],
    retrievedAt: new Date().toISOString(),
  };
  const notes: string[] = [
    "Based on reported fundamentals available at each observation date.",
  ];

  const sortedPeriods = [...periods].sort(byEndDate);
  const sortedCandles = [...candles].sort(byDate);

  const flags: ObservationNoteFlags = {
    negativeEps: false,
    nonPositiveEquity: false,
    missingEvInputs: false,
  };
  let skippedNoPrice = 0;

  const points: ValuationPoint[] = [];
  for (const p of sortedPeriods) {
    const price = priceOnOrBefore(p.endDate, sortedCandles);
    if (price === null) {
      skippedNoPrice += 1;
      continue;
    }
    const pt = buildPoint(p, price, flags);
    // Keep only observations that produced at least one non-null multiple.
    if (
      pt.pe !== null ||
      pt.pb !== null ||
      pt.evEbitda !== null ||
      pt.evSales !== null ||
      pt.fcfYield !== null
    ) {
      points.push(pt);
    }
  }
  // Points already ascending by date (periods were sorted); sort defensively.
  points.sort(byDate);

  const asOf =
    points.length > 0
      ? (points[points.length - 1] as ValuationPoint).date
      : sortedPeriods.length > 0
        ? sortedPeriods[sortedPeriods.length - 1].endDate
        : "";

  // Spec 7: EV/EBITDA is not meaningful for banks/NBFCs.
  const skipEvEbitda = companyType === "bank-nbfc";
  if (skipEvEbitda) {
    notes.push("EV/EBITDA is not applicable to banks/NBFCs and was omitted.");
  }

  const multiples: ValuationMultiple[] = [];
  let anyInsufficient = false;
  for (const def of MULTIPLE_DEFS) {
    if (def.id === "ev-ebitda" && skipEvEbitda) continue;
    const m = buildMultiple(def, points, asOf);
    if (m) {
      multiples.push(m);
      if (Object.values(m.stats).some((s) => s.insufficient))
        anyInsufficient = true;
    }
  }

  if (flags.negativeEps)
    notes.push("P/E omitted for periods with non-positive earnings.");
  if (flags.nonPositiveEquity)
    notes.push("P/B omitted for periods with non-positive book equity.");
  if (flags.missingEvInputs)
    notes.push(
      "EV-based multiples omitted for periods with missing debt, cash or market-cap inputs.",
    );
  if (skippedNoPrice > 0)
    notes.push(
      `${skippedNoPrice} observation${skippedNoPrice === 1 ? " was" : "s were"} skipped: no market price available on or before the period end date.`,
    );
  if (anyInsufficient)
    notes.push(
      `Windows with fewer than ${MIN_OBSERVATIONS} valid observations are marked as insufficient valuation history.`,
    );
  notes.push(
    "FCF Yield is expressed as a fraction of market capitalization (multiply by 100 for %).",
  );

  return { multiples, asOf, source, notes };
}
