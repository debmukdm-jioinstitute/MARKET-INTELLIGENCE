/**
 * Financial model data contracts. All monetary values are stored in the
 * reporting currency, raw units (not millions) unless noted. Missing values
 * are null. Cash-flow sign convention: outflows are negative (capex,
 * dividends, buybacks, debt repayment).
 */

export const INCOME_FIELDS = [
  "revenue", "cogs", "gross_profit", "sga", "rnd", "opex_total", "operating_income",
  "da", "interest_expense", "interest_income", "pretax_income", "tax", "net_income",
  "diluted_shares", "basic_shares", "diluted_eps", "ebitda",
] as const;

export const BALANCE_FIELDS = [
  "cash", "cash_and_sti", "receivables", "inventory", "current_assets", "ppe",
  "goodwill_intangibles", "total_assets", "payables", "short_term_debt",
  "current_liabilities", "long_term_debt", "total_liabilities", "total_equity",
  "stockholders_equity", "retained_earnings", "total_debt", "shares_outstanding",
] as const;

export const CASHFLOW_FIELDS = [
  "cfo", "da_cf", "sbc", "change_wc", "capex", "cfi", "cff", "dividends", "buybacks",
  "stock_issued", "debt_issued", "debt_repaid", "begin_cash", "end_cash",
  "net_change_cash", "free_cash_flow",
] as const;

export type FieldKey =
  | (typeof INCOME_FIELDS)[number]
  | (typeof BALANCE_FIELDS)[number]
  | (typeof CASHFLOW_FIELDS)[number];

export type FiscalPeriod = {
  periodEnd: string; // YYYY-MM-DD
  fiscalYear: number;
  fields: Partial<Record<FieldKey, number | null>>;
};

export type CompanyProfile = {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  fiscalYearEndMonth: number | null;
};

export type MarketSnapshot = {
  price: number;
  priceDate: string;
  sharesOutstanding: number;
  currency: string;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  riskFreeRate: number | null;
  riskFreeSource: string;
  indexSymbol: string;
  indexName: string;
  listingCurrency: string;
  listingPrice: number | null;
  fxRate: number | null;
};

export type PriceSeries = {
  symbol: string;
  name: string;
  dates: string[];
  closes: number[];
};

export type FinancialDataset = {
  profile: CompanyProfile;
  market: MarketSnapshot;
  periods: FiscalPeriod[]; // oldest -> newest, last 6 fiscal years
  stockPrices: PriceSeries; // monthly, aligned with indexPrices
  indexPrices: PriceSeries;
  source: string;
  retrievedAt: string;
  notes: string[];
};

// ---------------------------------------------------------------------------
// Assumptions
// ---------------------------------------------------------------------------

export type AssumptionFmt = "num" | "num1" | "pct" | "pct2" | "days" | "mult" | "price" | "beta" | "int" | "factor";
export type AssumptionKind = "scalar" | "vector";

export type AssumptionSpec = {
  key: string;
  label: string;
  section: string;
  fmt: AssumptionFmt;
  kind: AssumptionKind;
  lo?: number;
  hi?: number;
  help?: string;
};

export type AssumptionValue = number | number[];

export type Assumptions = {
  years: number;
  values: Record<string, AssumptionValue>;
  basis: Record<string, string>;
  overridden: string[];
};

// ---------------------------------------------------------------------------
// Model output
// ---------------------------------------------------------------------------

export type ProjectionYear = {
  fiscalYear: number;
  label: string;
  revenue: number;
  grossProfit: number;
  ebit: number;
  ebitda: number;
  nopat: number;
  da: number;
  capex: number;
  changeWc: number;
  sbc: number;
  fcff: number;
  netIncome: number;
  eps: number;
};

export type BetaResult = {
  nObs: number;
  rawBeta: number;
  adjBeta: number; // Blume-adjusted
  fallback: boolean;
  leveredBetaUsed: number;
  deCurrent: number;
  unleveredBeta: number;
  selectedBeta: number; // relevered at target D/E
};

export type WaccResult = {
  marketCap: number;
  debt: number;
  deCurrent: number;
  dvCurrent: number;
  dvTarget: number;
  evTarget: number;
  deTarget: number;
  costOfEquity: number;
  costOfDebtAfterTax: number;
  wacc: number;
};

export type DcfResult = {
  years: ProjectionYear[];
  discountPeriods: number[];
  pvFcff: number[];
  sumPv: number;
  fcffTerminal: number;
  ebitdaTerminal: number;
  tvGordon: number;
  tvExit: number;
  pvTvGordon: number;
  pvTvExit: number;
  pvTv: number; // per selected method
  enterpriseValue: number;
  lessDebt: number;
  plusCash: number;
  equityValue: number;
  impliedPrice: number;
  currentPrice: number;
  upside: number;
  tvShareOfEv: number;
  impliedExitMultiple: number;
  impliedGrowthFromExit: number;
};

export type SensitivityTable = {
  title: string;
  waccSteps: number[]; // absolute WACC values across the columns
  rowLabel: string;
  rowValues: number[]; // absolute values down the rows (growth or multiple)
  grid: (number | null)[][]; // [row][col] implied price
};

export type RatioRow = {
  key: string;
  label: string;
  section: string;
  fmt: AssumptionFmt;
  values: (number | null)[]; // one per historical + projection year
};

export type ModelResult = {
  dataset: FinancialDataset;
  assumptions: Assumptions;
  beta: BetaResult;
  wacc: WaccResult;
  dcf: DcfResult;
  sensitivityGordon: SensitivityTable;
  sensitivityExit: SensitivityTable;
  ratios: RatioRow[];
  checks: { label: string; value: string; pass: boolean; why: string }[];
};
