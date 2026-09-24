/**
 * Prowess report registry. `batch` is a file in `prowess-batches/`.
 * `ttlHours` = how long a stored copy is considered fresh before the sync job refetches it.
 */
export const REPORTS = {
  profile: { batch: "company-profile.json", ttlHours: 24 * 7, label: "One Page Profile" },
  financials: { batch: "company-financials.json", ttlHours: 24 * 7, label: "Income & Expenditure Summary" },
  balance: { batch: "company-balance-sheet.json", ttlHours: 24 * 7, label: "Balance Sheet Summary" },
  cashflow: { batch: "company-cashflow.json", ttlHours: 24 * 7, label: "Cash Flow Summary" },
  stock: { batch: "company-stock.json", ttlHours: 20, label: "Daily Stock Indicators and Ratios" },
  returns: { batch: "company-returns-annual.json", ttlHours: 24, label: "Trends in Annual Returns" },
} as const;

export type ReportId = keyof typeof REPORTS;
export const REPORT_IDS = Object.keys(REPORTS) as ReportId[];
export function isReportId(v: unknown): v is ReportId {
  return typeof v === "string" && v in REPORTS;
}
