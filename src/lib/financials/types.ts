import type { Basis } from "./xbrl";
import type { Layout, LineKind, LineUnit } from "./lines";

export type PeriodType = "quarter" | "annual";

export type StatementColumn = {
  key: string; // e.g. "2026-Q1", "FY2026"
  label: string; // e.g. "Q1 FY27", "FY26"
  startDate: string;
  endDate: string;
  periodKind: PeriodType;
  audited: boolean | null;
  /** Consolidated filings win over standalone for the same period; shown per column. */
  basis: Basis | null;
  filingDate?: string;
  xbrlUrl?: string;
  ixbrlUrl?: string;
  pdfUrl?: string;
};

export type StatementRow = {
  tag: string;
  label: string;
  kind: LineKind;
  unit: LineUnit;
  /** period key -> value in INR Crores or per-share */
  values: Record<string, number | null>;
};

export type WorkingCapitalMetrics = {
  periodKey: string;
  periodLabel: string;
  revenue: number | null;
  cogs: number | null;
  tradeReceivables: number | null;
  inventories: number | null;
  tradePayables: number | null;
  workingCapital: number | null;
  dso: number | null; // Days Sales Outstanding
  dio: number | null; // Days Inventory Outstanding
  dpo: number | null; // Days Payable Outstanding
  ccc: number | null; // Cash Conversion Cycle (DSO + DIO - DPO)
};

export type FinancialRatioMetrics = {
  periodKey: string;
  periodLabel: string;
  opmPct: number | null; // Operating Profit Margin %
  npmPct: number | null; // Net Profit Margin %
  roePct: number | null; // Return on Equity %
  rocePct: number | null; // Return on Capital Employed %
  debtToEquity: number | null; // Total Debt / Equity
  currentRatio: number | null; // Current Assets / Current Liabilities
  interestCoverage: number | null; // EBIT / Finance Costs
  cfoToNetProfit: number | null; // Operating Cash Flow / Net Profit
};

export type AnnualReportDoc = {
  fromYear: string;
  toYear: string;
  financialYear: string;
  companyName: string;
  broadcastDate: string | null;
  url: string;
  fileSize: string | null;
  submissionType: string | null;
};

export type ForensicMetricId = "debt" | "cash-cycle" | "margin" | "cash-backing" | "other";

export type ForensicFlag = {
  type: "warning" | "strength" | "neutral";
  category: "solvency" | "governance" | "cash_flow" | "working_capital" | "profitability";
  title: string;
  detail: string;
  metricValue?: string;
  /** Stable id for tile labeling (replaces suffix-regex heuristics). */
  metricId: ForensicMetricId;
};

export type ExecutiveForensicAnalysis = {
  healthScore: number; // 0 to 100
  rating: "Strong" | "Adequate" | "Cautionary" | "Distressed";
  executiveSummary: string;
  aiModelUsed: string;
  flags: ForensicFlag[];
  workingCapitalSummary: string;
  cashFlowQuality: "High" | "Moderate" | "Weak";
  /** True when no XBRL statements were parsed: score/rating must not be shown as a verdict. */
  insufficientData?: boolean;
};

export type FinancialsPayload = {
  symbol: string;
  companyName: string;
  layout: Layout;
  asOf: string;
  quarters: StatementColumn[];
  annuals: StatementColumn[];
  pl: {
    quarters: StatementRow[];
    annuals: StatementRow[];
  };
  bs: {
    quarters: StatementRow[];
    annuals: StatementRow[];
  };
  cf: {
    quarters: StatementRow[];
    annuals: StatementRow[];
  };
  workingCapital: {
    quarters: WorkingCapitalMetrics[];
    annuals: WorkingCapitalMetrics[];
  };
  ratios: {
    quarters: FinancialRatioMetrics[];
    annuals: FinancialRatioMetrics[];
  };
  annualReports: AnnualReportDoc[];
  forensicAnalysis: ExecutiveForensicAnalysis;
  officialSources: {
    name: string;
    provider: string;
    url: string;
    description: string;
  }[];
};
