import type { FinancialDataset } from "@/lib/models/types";

const FIN_RE = /financ|bank|insur|capital market|credit|asset management|nbfc|brokerage/i;

/** True for banks / insurers / NBFCs, where FCFF-DCF is not meaningful (debt is raw material, not financing). */
export function isFinancialCompany(ds: FinancialDataset): boolean {
  const label = `${ds.profile.sector ?? ""} ${ds.profile.industry ?? ""}`;
  if (FIN_RE.test(label)) return true;
  // Fallback when sector is unknown: no cost of revenue and interest expense is a large share of revenue.
  const last = ds.periods[ds.periods.length - 1]?.fields;
  if (!last) return false;
  const rev = Number(last.revenue) || 0;
  const cogs = Number(last.cogs) || 0;
  const ie = Number(last.interest_expense) || 0;
  return rev > 0 && cogs === 0 && ie / rev > 0.3;
}

/** Coefficient of variation of EBIT margin across the history: > ~0.5 signals a cyclical / volatile earner. */
export function marginVolatility(ds: FinancialDataset): number {
  const m = ds.periods
    .map((p) => ((Number(p.fields.operating_income) || 0) / (Number(p.fields.revenue) || 0)))
    .filter((x) => Number.isFinite(x));
  if (m.length < 3) return 0;
  const mean = m.reduce((s, v) => s + v, 0) / m.length;
  const sd = Math.sqrt(m.reduce((s, v) => s + (v - mean) ** 2, 0) / m.length);
  return Math.abs(mean) > 1e-6 ? sd / Math.abs(mean) : 0;
}
