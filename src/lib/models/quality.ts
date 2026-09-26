/**
 * Data-quality screen: flags things that make a DCF unreliable *before* it
 * is trusted — stale statements, one-off-distorted base years, stub periods,
 * base-year vs TTM divergence, and outlier ratios.
 */
import type { FinancialDataset, QualityFlag } from "@/lib/models/types";

type Row = Record<string, number>;
const M = 1e6;

export function runDataQuality(ds: FinancialDataset, rows: Row[], n: number): QualityFlag[] {
  const flags: QualityFlag[] = [];
  const L = n - 1;
  const last = rows[L];
  const prev = rows[L - 1];

  // 1. stale statements
  const ageDays = (new Date(ds.retrievedAt).getTime() - new Date(ds.periods[L].periodEnd).getTime()) / 86_400_000;
  if (ageDays > 460) {
    flags.push({ severity: "warn", label: "Stale financial statements", detail: `The latest annual statements end ${ds.periods[L].periodEnd} (${Math.round(ageDays / 30)} months ago). A newer fiscal year has probably been reported; the base year may be outdated.` });
  }

  // 2. base year vs trailing twelve months
  const ttm = ds.ttm;
  if (ttm?.revenue && last.revenue > 0) {
    const gap = ttm.revenue / M / last.revenue - 1;
    if (Math.abs(gap) > 0.15) {
      flags.push({ severity: "warn", label: "Base year differs from TTM", detail: `Trailing-twelve-month revenue is ${(gap * 100).toFixed(0)}% ${gap > 0 ? "above" : "below"} the latest fiscal year. The projection starts from the annual base; consider updating it (current multiples on this page already use TTM). Calendarisation to a common fiscal year-end is not performed.` });
    }
  }
  if (ttm?.net_income != null && last.net_income !== 0) {
    const gap = ttm.net_income / M / last.net_income - 1;
    if (Math.abs(gap) > 0.4 && Math.abs(last.net_income) > 0) {
      flags.push({ severity: "info", label: "TTM earnings diverge from annual", detail: `TTM net income is ${(gap * 100).toFixed(0)}% ${gap > 0 ? "above" : "below"} the latest fiscal year.` });
    }
  }

  // 3. one-offs in the base year
  if (last.ebt > 0) {
    const etr = last.tax / last.ebt;
    if (etr < 0.05 || etr > 0.45) {
      flags.push({ severity: "warn", label: "Unusual effective tax rate in base year", detail: `FY${ds.periods[L].fiscalYear} effective tax rate is ${(etr * 100).toFixed(1)}% — likely a one-off (deferred-tax item, settlement, or tax holiday). The projection converges to the marginal rate, but check the near-term rate.` });
    }
  }
  if (prev && prev.net_income > 0 && last.net_income / prev.net_income - 1 > 0.6 && last.revenue / Math.max(prev.revenue, 1e-9) - 1 < 0.25) {
    flags.push({ severity: "warn", label: "Possible one-off gain in base-year earnings", detail: "Net income jumped >60% on <25% revenue growth — check for asset-sale gains, tax write-backs or exceptional items that inflate the base year." });
  }
  if (prev && prev.revenue > 0 && last.revenue / prev.revenue - 1 < -0.3) {
    flags.push({ severity: "warn", label: "Sharp revenue decline", detail: `Revenue fell ${((1 - last.revenue / prev.revenue) * 100).toFixed(0)}% in the latest fiscal year (divestiture, restatement, or cyclical trough) — historical averages may not represent normal operations.` });
  }
  const margins = rows.slice(0, n).map((r) => (r.revenue > 0 ? r.ebit / r.revenue : NaN)).filter(Number.isFinite);
  if (margins.length >= 4) {
    const mean = margins.reduce((s, v) => s + v, 0) / margins.length;
    const sd = Math.sqrt(margins.reduce((s, v) => s + (v - mean) ** 2, 0) / margins.length);
    const z = sd > 1e-9 ? (margins[margins.length - 1] - mean) / sd : 0;
    if (Math.abs(z) > 1.6) {
      flags.push({ severity: "warn", label: "Base-year margin is an outlier", detail: `The latest EBIT margin is ${z.toFixed(1)} standard deviations from its own history. For cyclical earners, re-derive assumptions with a 6-year lookback (mid-cycle margins) and use the margin-fade switch.` });
    }
    if (Math.abs(mean) > 1e-6 && sd / Math.abs(mean) > 0.5) {
      flags.push({ severity: "info", label: "Cyclical / volatile margins", detail: `EBIT margin varies with a coefficient of variation of ${(sd / Math.abs(mean)).toFixed(2)}. Normalise to mid-cycle rather than extrapolating the recent level.` });
    }
  }

  // 4. structural
  if (last.total_equity <= 0) flags.push({ severity: "warn", label: "Negative book equity", detail: "Book equity is non-positive (buyback-driven or loss-making): ROE / P/B based measures are not meaningful." });
  if (ds.periods.length < 4) flags.push({ severity: "info", label: "Short history", detail: `Only ${ds.periods.length} fiscal years of statements: averages and fades rest on limited data.` });
  if (ds.periods[L].fields.shares_outstanding == null) flags.push({ severity: "info", label: "Share count proxied", detail: "Shares outstanding proxied by weighted-average diluted shares." });
  return flags;
}
