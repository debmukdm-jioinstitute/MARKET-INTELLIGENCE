/**
 * Cross-checks Yahoo's operating income against its own EBIT line.
 *
 * Yahoo's `OperatingIncome` is occasionally computed on a different basis (e.g. gross profit less an expense
 * total that already contains finance costs or impairments), giving values wildly off `EBIT` — Woolworths
 * FY26: OperatingIncome -A$128M vs EBIT +A$1,853M (= pre-tax income + interest). A wrong operating income
 * poisons margins, interest coverage (and so the synthetic rating), and every projection built on it.
 *
 * Rule: if the two disagree by more than 50% of the larger AND by more than 1% of revenue, fall back to EBIT.
 * Normal differences (EBIT including other income, as for Reliance) stay below the threshold and are left alone.
 */
import type { FiscalPeriod } from "@/lib/models/types";

export function reconcileOperatingIncome(periods: FiscalPeriod[]): string[] {
  const swapped: string[] = [];
  for (const p of periods) {
    const op = p.fields.operating_income;
    const alt = p.fields.ebit;
    const rev = Number(p.fields.revenue) || 0;
    if (op == null || alt == null || !(rev > 0)) continue;
    const gap = Math.abs(op - alt);
    if (gap > 0.5 * Math.max(Math.abs(op), Math.abs(alt)) && gap > 0.01 * rev) {
      p.fields.operating_income = alt;
      swapped.push(`FY${p.fiscalYear}`);
    }
  }
  return swapped.length
    ? [`Yahoo's operating income disagreed materially with its EBIT line for ${swapped.join(", ")}; EBIT (pre-tax income + interest) was used instead so margins and interest coverage are not distorted.`]
    : [];
}
