/**
 * Shared contracts for Phase 1 research analytics (Financial X-Ray, Financial
 * DNA, Red Flags, Historical Valuation).
 *
 * Pure TypeScript, no dependencies, deterministic.
 * Every displayed metric carries a state + provenance source so the UI can
 * render "Unavailable" / "Insufficient reported history" instead of invented
 * data (spec §1 — never invent data).
 *
 * The four section payload types are imported via `import type` from sibling
 * modules owned by other workstreams (./xray, ./financial-dna, ./red-flags,
 * ./valuation-history). Those modules do not exist yet in this worktree;
 * type-only imports are erased at compile/test time, so vitest/eslint stay
 * green. DO NOT create those files here.
 */
import type { FinancialXRay } from "./xray";
import type { FinancialDNA } from "./financial-dna";
import type { RedFlagResult } from "./red-flags";
import type { ValuationHistory } from "./valuation-history";

/** Where a metric's value came from. Derived metrics list their inputs. */
export type MetricSource = {
  provider: string;
  sourceType: "exchange" | "company_filing" | "market_data" | "derived";
  sourceUrl?: string;
  filingDate?: string;
  period?: string;
  retrievedAt?: string;
  inputs?: string[];
};

/**
 * Availability state of a metric:
 * - "ok": finite value present
 * - "unavailable": no usable value
 * - "not-applicable": metric is meaningless for this company type
 *   (e.g. inventory turnover for a bank)
 * - "insufficient-history": metric needs more reported periods than exist
 */
export type MetricState =
  | "ok"
  | "unavailable"
  | "not-applicable"
  | "insufficient-history";

/** Unit of a metric value; null when the metric has no value. */
export type MetricUnit = "inr-cr" | "pct" | "multiple" | "days" | "ratio" | null;

/**
 * A single displayable metric. `value` is null unless state is "ok".
 * `note` holds a short human-readable explanation when the metric is not
 * "ok" (e.g. "Company has reported only 2 years; CAGR needs 3+").
 */
export type Metric = {
  value: number | null;
  unit: MetricUnit;
  state: MetricState;
  note: string | null;
  source: MetricSource;
};

/**
 * Sector-family classification used to pick applicable metrics and drivers.
 * "industrial" covers manufacturing/services; "bank-nbfc" covers banks and
 * NBFCs (different balance-sheet semantics); "unknown" when the classifier
 * cannot determine the type.
 */
export type CompanyType = "industrial" | "bank-nbfc" | "unknown";

/**
 * One normalized financial period (quarter / TTM / fiscal year).
 * Monetary fields are in INR crore unless the provider states otherwise.
 * Fields stay null when the source did not report them — never 0-filled.
 */
export type NormalizedPeriod = {
  key: string;
  label: string;
  endDate: string;
  filingDate?: string | null;
  revenue: number | null;
  grossProfit: number | null;
  ebitda: number | null;
  ebit: number | null;
  pbt: number | null;
  pat: number | null;
  eps: number | null;
  cfo: number | null;
  capex: number | null;
  freeCashFlow: number | null;
  totalAssets: number | null;
  totalEquity: number | null;
  totalDebt: number | null;
  cash: number | null;
  currentAssets: number | null;
  currentLiabilities: number | null;
  inventory: number | null;
  receivables: number | null;
  payables: number | null;
  interestExpense: number | null;
  sharesOutstanding: number | null;
  otherIncome: number | null;
  cogs: number | null;
  source: MetricSource;
};

/**
 * Build a metric. State is "ok" iff value is a finite number, otherwise
 * "unavailable". NaN / ±Infinity / null are never presented as data.
 */
export const metric = (
  value: number | null,
  unit: MetricUnit,
  source: MetricSource,
  note?: string | null,
): Metric => ({
  value,
  unit,
  state: Number.isFinite(value) ? "ok" : "unavailable",
  note: note ?? null,
  source,
});

/** Metric with no usable value and a generic "unavailable" state. */
export const unavailable = (
  source: MetricSource,
  note?: string | null,
): Metric => ({
  value: null,
  unit: null,
  state: "unavailable",
  note: note ?? null,
  source,
});

/** Metric that is meaningless for this company type. */
export const notApplicable = (
  source: MetricSource,
  note?: string | null,
): Metric => ({
  value: null,
  unit: null,
  state: "not-applicable",
  note: note ?? null,
  source,
});

/**
 * Metric that needs more reported history than the company has (e.g. a CAGR
 * with fewer than the required periods).
 */
export const insufficientHistory = (
  source: MetricSource,
  note?: string | null,
): Metric => ({
  value: null,
  unit: null,
  state: "insufficient-history",
  note: note ?? null,
  source,
});

/** Top-level payload for one company's Phase 1 research analytics. */
export type CompanyResearchAnalytics = {
  symbol: string;
  generatedAt: string;
  companyType: CompanyType;
  financialXRay: FinancialXRay | null;
  financialDNA: FinancialDNA | null;
  redFlags: RedFlagResult | null;
  historicalValuation: ValuationHistory | null;
  provenance: { financialsAsOf: string | null; sources: MetricSource[] };
};
