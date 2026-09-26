/**
 * Derives default DCF model assumptions from historical financials, with an
 * audit trail — every assumption's `basis` string explains exactly how it
 * was derived (which years, which formula) so it can be challenged/overridden.
 *
 * Ported from FinTea's assumptions.py (Python) — same clamps, same formulas.
 */
import { marketValueOfDebt } from "@/lib/models/capital";
import { isFinancialCompany } from "@/lib/models/classify";
import { MATURE_ERP, marginalTaxRate, syntheticRating } from "@/lib/models/country";
import type { AssumptionSpec, Assumptions, FinancialDataset } from "@/lib/models/types";

const M = 1e6;

export const ASSUMPTION_SPECS: AssumptionSpec[] = [
  { key: "model_type", label: "Valuation model (1 = FCFF DCF, 2 = residual income — banks / insurers / NBFCs)", section: "General", fmt: "int", kind: "scalar", lo: 1, hi: 2 },
  { key: "projection_years", label: "Projection years", section: "General", fmt: "int", kind: "scalar", lo: 3, hi: 10, help: "Number of explicit forecast years" },
  { key: "price", label: "Current share price", section: "Market data", fmt: "price", kind: "scalar", lo: 0.0001 },
  { key: "shares_outstanding", label: "Shares outstanding (millions)", section: "Market data", fmt: "num1", kind: "scalar", lo: 0.0001 },
  { key: "risk_free", label: "Risk-free rate", section: "Cost of capital", fmt: "pct2", kind: "scalar", lo: -0.02, hi: 0.25 },
  { key: "erp", label: "Equity risk premium", section: "Cost of capital", fmt: "pct2", kind: "scalar", lo: 0, hi: 0.2 },
  { key: "country_risk_premium", label: "Country risk premium (added to ERP)", section: "Cost of capital", fmt: "pct2", kind: "scalar", lo: 0, hi: 0.15 },
  { key: "beta_method", label: "Beta source (1 = own regression, 2 = peer bottom-up median)", section: "Cost of capital", fmt: "int", kind: "scalar", lo: 1, hi: 2 },
  { key: "debt_maturity", label: "Average debt maturity (years, for market value of debt)", section: "Cost of capital", fmt: "num1", kind: "scalar", lo: 1, hi: 30 },
  { key: "size_premium", label: "Size / company-specific premium", section: "Cost of capital", fmt: "pct2", kind: "scalar", lo: -0.05, hi: 0.15 },
  { key: "use_blume", label: "Use Blume-adjusted beta (1 = yes, 0 = raw)", section: "Cost of capital", fmt: "int", kind: "scalar", lo: 0, hi: 1 },
  { key: "target_debt_weight", label: "Target debt / (debt + equity)", section: "Cost of capital", fmt: "pct", kind: "scalar", lo: 0, hi: 0.95 },
  { key: "cost_of_debt", label: "Pre-tax cost of debt", section: "Cost of capital", fmt: "pct2", kind: "scalar", lo: 0, hi: 0.4 },
  { key: "cash_yield", label: "Interest yield on cash", section: "Operating", fmt: "pct2", kind: "scalar", lo: 0, hi: 0.25 },
  { key: "tax_rate", label: "Effective tax rate (near term)", section: "Operating", fmt: "pct", kind: "scalar", lo: 0, hi: 0.6 },
  { key: "terminal_tax_rate", label: "Terminal / marginal tax rate (effective rate converges to this)", section: "Operating", fmt: "pct", kind: "scalar", lo: 0, hi: 0.6 },
  { key: "nol_opening", label: "Opening tax-loss carryforward (NOL)", section: "Operating", fmt: "num", kind: "scalar", lo: 0 },
  { key: "nol_usage_cap", label: "NOL usage cap (% of taxable income per year)", section: "Operating", fmt: "pct", kind: "scalar", lo: 0, hi: 1 },
  { key: "target_ebit_margin", label: "Long-run EBIT margin (fade target)", section: "Operating", fmt: "pct", kind: "scalar", lo: -1, hi: 1 },
  { key: "margin_fade", label: "Fade EBIT margin linearly to the long-run target (1 = yes)", section: "Operating", fmt: "int", kind: "scalar", lo: 0, hi: 1 },
  { key: "driver_mode", label: "Revenue driver (0 = total growth, 1 = volume x price)", section: "Operating", fmt: "int", kind: "scalar", lo: 0, hi: 1 },
  { key: "dso", label: "Days sales outstanding (receivables)", section: "Working capital", fmt: "days", kind: "scalar", lo: 0, hi: 400 },
  { key: "dio", label: "Days inventory outstanding", section: "Working capital", fmt: "days", kind: "scalar", lo: 0, hi: 400 },
  { key: "dpo", label: "Days payables outstanding", section: "Working capital", fmt: "days", kind: "scalar", lo: 0, hi: 400 },
  { key: "other_ca_pct", label: "Other current assets % of revenue", section: "Working capital", fmt: "pct", kind: "scalar", lo: 0, hi: 3 },
  { key: "other_cl_pct", label: "Other current liabilities % of revenue", section: "Working capital", fmt: "pct", kind: "scalar", lo: 0, hi: 3 },
  { key: "other_nca_pct", label: "Other non-current assets % of revenue", section: "Working capital", fmt: "pct", kind: "scalar", lo: 0, hi: 5 },
  { key: "other_ncl_pct", label: "Other non-current liabilities % of revenue", section: "Working capital", fmt: "pct", kind: "scalar", lo: 0, hi: 5 },
  { key: "payout_ratio", label: "Dividend payout ratio (% of net income)", section: "Capital allocation", fmt: "pct", kind: "scalar", lo: 0, hi: 1.5 },
  { key: "min_cash_pct", label: "Minimum cash & ST investments (% of revenue) — revolver funds any gap", section: "Capital allocation", fmt: "pct", kind: "scalar", lo: 0, hi: 1 },
  { key: "share_change", label: "Diluted share count change p.a.", section: "Capital allocation", fmt: "pct2", kind: "scalar", lo: -0.15, hi: 0.15 },
  { key: "terminal_growth", label: "Terminal (perpetual) growth rate", section: "Terminal value", fmt: "pct2", kind: "scalar", lo: -0.02, hi: 0.06 },
  { key: "terminal_roic_spread", label: "Terminal ROIC minus WACC (reinvestment = g / ROIC)", section: "Terminal value", fmt: "pct2", kind: "scalar", lo: -0.02, hi: 0.25 },
  { key: "exit_multiple", label: "Exit EV / EBITDA multiple", section: "Terminal value", fmt: "mult", kind: "scalar", lo: 1, hi: 60 },
  { key: "tv_method", label: "Terminal value method (1 = Gordon growth, 2 = exit multiple)", section: "Terminal value", fmt: "int", kind: "scalar", lo: 1, hi: 2 },
  { key: "mid_year", label: "Mid-year discounting convention (1 = yes)", section: "Terminal value", fmt: "int", kind: "scalar", lo: 0, hi: 1 },
  { key: "sbc_addback", label: "Add back stock-based compensation to FCFF (1 = yes)", section: "Terminal value", fmt: "int", kind: "scalar", lo: 0, hi: 1 },
  { key: "rev_growth", label: "Revenue growth", section: "Operating drivers", fmt: "pct", kind: "vector", lo: -0.9, hi: 3.0 },
  { key: "volume_growth", label: "Volume growth (used when driver mode = 1)", section: "Operating drivers", fmt: "pct", kind: "vector", lo: -0.9, hi: 3.0 },
  { key: "price_growth", label: "Price / mix growth (used when driver mode = 1)", section: "Operating drivers", fmt: "pct", kind: "vector", lo: -0.5, hi: 1.0 },
  { key: "gross_margin", label: "Gross margin", section: "Operating drivers", fmt: "pct", kind: "vector", lo: -1, hi: 1 },
  { key: "sga_pct", label: "SG&A % of revenue", section: "Operating drivers", fmt: "pct", kind: "vector", lo: 0, hi: 2 },
  { key: "rnd_pct", label: "R&D % of revenue", section: "Operating drivers", fmt: "pct", kind: "vector", lo: 0, hi: 2 },
  { key: "other_opex_pct", label: "Other operating expense % of revenue", section: "Operating drivers", fmt: "pct", kind: "vector", lo: -1, hi: 2 },
  { key: "da_pct", label: "D&A % of opening net PP&E", section: "Operating drivers", fmt: "pct", kind: "vector", lo: 0, hi: 2 },
  { key: "capex_pct", label: "Capex % of revenue", section: "Operating drivers", fmt: "pct", kind: "vector", lo: 0, hi: 2 },
  { key: "sbc_pct", label: "Stock-based compensation % of revenue", section: "Operating drivers", fmt: "pct", kind: "vector", lo: 0, hi: 1 },
  { key: "other_nonop", label: "Other non-operating income / (expense)", section: "Operating drivers", fmt: "num", kind: "vector" },
  { key: "net_debt_issuance", label: "Net debt issuance / (repayment)", section: "Capital allocation", fmt: "num", kind: "vector" },
  { key: "buybacks", label: "Share repurchases", section: "Capital allocation", fmt: "num", kind: "vector", lo: 0 },
  { key: "minority_interest", label: "Minority (non-controlling) interest", section: "Equity bridge", fmt: "num", kind: "scalar", lo: 0 },
  { key: "preferred_equity", label: "Preferred equity", section: "Equity bridge", fmt: "num", kind: "scalar", lo: 0 },
  { key: "pension_deficit", label: "Pension / post-retirement deficit", section: "Equity bridge", fmt: "num", kind: "scalar", lo: 0 },
  { key: "extra_debt_like", label: "Other debt-like items (e.g. operating leases not in reported debt)", section: "Equity bridge", fmt: "num", kind: "scalar", lo: 0 },
  { key: "lt_investments", label: "Long-term / equity-method investments (non-operating, added back)", section: "Equity bridge", fmt: "num", kind: "scalar", lo: 0 },
  { key: "use_dilution", label: "Apply dilution (treasury-stock method) (1 = yes)", section: "Dilution", fmt: "int", kind: "scalar", lo: 0, hi: 1 },
  { key: "options_outstanding", label: "Options outstanding (millions)", section: "Dilution", fmt: "num1", kind: "scalar", lo: 0 },
  { key: "option_strike", label: "Weighted-average option strike", section: "Dilution", fmt: "price", kind: "scalar", lo: 0 },
  { key: "rsus", label: "RSUs / dilutive securities (millions)", section: "Dilution", fmt: "num1", kind: "scalar", lo: 0 },
  { key: "convertible_shares", label: "Convertible shares if converted (millions)", section: "Dilution", fmt: "num1", kind: "scalar", lo: 0 },
  { key: "convert_price", label: "Conversion price (converts only when implied price is above)", section: "Dilution", fmt: "price", kind: "scalar", lo: 0 },
  { key: "ri_roe", label: "Starting return on equity", section: "Financials (residual income)", fmt: "pct", kind: "scalar", lo: -0.5, hi: 0.8 },
  { key: "ri_payout", label: "Dividend payout ratio", section: "Financials (residual income)", fmt: "pct", kind: "scalar", lo: 0, hi: 1 },
  { key: "ri_terminal_spread", label: "Long-run ROE minus cost of equity", section: "Financials (residual income)", fmt: "pct2", kind: "scalar", lo: -0.05, hi: 0.1 },
];
export const SPEC_BY_KEY = new Map(ASSUMPTION_SPECS.map((s) => [s.key, s]));

const pctStr = (x: number) => `${(x * 100).toFixed(1)}%`;
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export function deriveAssumptions(ds: FinancialDataset, years = 5, lookback = 3): Assumptions {
  lookback = Math.round(clamp(lookback, 1, 6));
  years = Math.round(clamp(years, 3, 10));
  const P = ds.periods;
  const n = P.length;
  const fy = P.map((p) => p.fiscalYear);

  const col = (key: string) => P.map((p) => (Number(p.fields[key as keyof typeof p.fields]) || 0) / M);

  const rev = col("revenue"), cogs = col("cogs"), sga = col("sga"), rnd = col("rnd"), ebit = col("operating_income");
  const daIs = col("da"), daCf = col("da_cf");
  const da = daIs.map((x, i) => x || daCf[i]);
  const capex = col("capex"), sbc = col("sbc"), tax = col("tax"), ebt = col("pretax_income");
  const ar = col("receivables"), inv = col("inventory"), ap = col("payables"), ca = col("current_assets"), cl = col("current_liabilities");
  const csti = col("cash_and_sti"), ta = col("total_assets"), tl = col("total_liabilities"), ppe = col("ppe"), gwi = col("goodwill_intangibles");
  const std = col("short_term_debt"), ltd = col("long_term_debt"), ie = col("interest_expense"), ii = col("interest_income");
  const div = col("dividends"), ni = col("net_income"), bb = col("buybacks"), si = col("stock_issued");
  const dsh = col("diluted_shares");
  const ebitda = ebit.map((e, i) => e + da[i]);
  const L = n - 1; // base year index
  const recent = Array.from({ length: Math.min(lookback, n) }, (_, i) => n - Math.min(lookback, n) + i);
  const yrsTxt = recent.map((i) => `FY${fy[i]}`).join(", ");

  const V: Record<string, number | number[]> = {};
  const B: Record<string, string> = {};
  const overridden: string[] = [];

  V.model_type = isFinancialCompany(ds) ? 2 : 1;
  B.model_type = V.model_type === 2
    ? `Detected as a financial company (${ds.profile.sector ?? "sector unknown"} / ${ds.profile.industry ?? "industry unknown"}): FCFF-DCF is not meaningful for lenders, so a residual-income model is used.`
    : "Non-financial company: unlevered free-cash-flow DCF.";
  V.projection_years = years;
  B.projection_years = "Explicit forecast horizon; terminal value captures cash flows beyond it.";

  // ---- market ----
  V.price = ds.market.price;
  B.price = `${ds.source} closing price on ${ds.market.priceDate} (${ds.market.currency}).`;
  V.shares_outstanding = ds.market.sharesOutstanding / M;
  B.shares_outstanding = `Current shares outstanding reported by the source (used for market cap, WACC weights and the per-share bridge).`;
  const rf = ds.market.riskFreeRate ?? 0.04;
  V.risk_free = Math.round(rf * 1e5) / 1e5;
  B.risk_free = ds.market.riskFreeSource || "Default 4.0% (source did not provide a treasury yield).";
  V.erp = MATURE_ERP;
  B.erp = `Mature-market equity risk premium of ${pctStr(MATURE_ERP)} (Damodaran-style implied ERP; Kroll / survey range 4.5-5.5%).`;
  V.country_risk_premium = ds.market.countryRiskPremium ?? 0;
  B.country_risk_premium = ds.market.countrySource ?? "No country risk premium available.";
  const hasPeerBeta = (ds.peers?.medianUnleveredBeta ?? null) != null;
  V.beta_method = hasPeerBeta ? 2 : 1;
  B.beta_method = hasPeerBeta
    ? `Bottom-up: median unlevered beta of ${ds.peers!.peers.length} peers (${ds.peers!.medianUnleveredBeta!.toFixed(2)}), relevered at the target capital structure — less noisy than one stock's regression.`
    : "Peer set unavailable or too small (<3): the stock's own Blume-adjusted regression beta is used.";
  V.debt_maturity = 6;
  B.debt_maturity = "Assumed average debt maturity for the market-value-of-debt calculation (Damodaran approach).";
  V.size_premium = 0;
  B.size_premium = "No size or company-specific premium applied by default.";
  V.use_blume = 1;
  B.use_blume = "Blume adjustment (0.67 x raw + 0.33) reflects mean reversion of betas toward 1.0.";

  const mcap = (V.price as number) * (V.shares_outstanding as number);
  const bookDebt = std[L] + ltd[L];

  // Pre-tax cost of debt: synthetic rating from interest coverage (Damodaran), cross-checked against book-implied.
  const avgDebt = Array.from({ length: n - 1 }, (_, i) => i + 1).map((i) => (std[i] + ltd[i] + std[i - 1] + ltd[i - 1]) / 2);
  const kdObs = Array.from({ length: n - 1 }, (_, i) => i + 1).filter((i) => avgDebt[i - 1] > 0 && ie[i] > 0).map((i) => ie[i] / avgDebt[i - 1]);
  const bookKd = kdObs.length ? clamp(avg(kdObs.slice(-3)), 0.01, 0.25) : null;
  let kd: number;
  if (ie[L] > 0 && ebit[L] !== 0) {
    const cov = ebit[L] / ie[L];
    const { rating, spread } = syntheticRating(cov);
    kd = rf + spread;
    B.cost_of_debt = `Synthetic rating ${rating} from FY${fy[L]} interest coverage ${cov.toFixed(1)}x: risk-free ${pctStr(rf)} + spread ${pctStr(spread)} = ${pctStr(kd)}${bookKd != null ? ` (book-implied interest / avg debt: ${pctStr(bookKd)}, not used — historical coupons lag today's market rate)` : ""}.`;
  } else if (bookKd != null) {
    kd = bookKd;
    B.cost_of_debt = `No usable coverage ratio; interest expense / average total debt, recent average ${pctStr(bookKd)} (clamped 1%-25%).`;
  } else {
    kd = rf + 0.015;
    B.cost_of_debt = "No interest expense / debt history: risk-free rate + 150bp credit spread.";
  }
  V.cost_of_debt = Math.round(kd * 1e4) / 1e4;

  const debt = marketValueOfDebt(bookDebt, ie[L], kd, V.debt_maturity as number);
  const dw = debt + mcap > 0 ? debt / (debt + mcap) : 0;
  V.target_debt_weight = Math.round(dw * 1e4) / 1e4;
  B.target_debt_weight = (V.model_type === 2 ? "Not used for financial companies (cost of equity only; beta is not relevered). " : "") + `Current market capital structure: market value of debt ${debt.toFixed(0)} (book ${bookDebt.toFixed(0)}) / (debt + market cap ${mcap.toFixed(0)}) = ${pctStr(dw)}.`;

  const avgCash = Array.from({ length: n - 1 }, (_, i) => i + 1).map((i) => (csti[i] + csti[i - 1]) / 2);
  const cyObs = Array.from({ length: n - 1 }, (_, i) => i + 1).filter((i) => avgCash[i - 1] > 0 && ii[i] > 0).map((i) => ii[i] / avgCash[i - 1]);
  let cy: number;
  if (cyObs.length) {
    cy = clamp(avg(cyObs.slice(-3)), 0, Math.max(rf, 0));
    B.cash_yield = `Interest income / average cash & short-term investments, recent average ${pctStr(avg(cyObs.slice(-3)))}, capped at the risk-free rate.`;
  } else {
    cy = Math.max(0, rf - 0.01);
    B.cash_yield = "No interest income history: risk-free rate less 100bp.";
  }
  V.cash_yield = Math.round(cy * 1e4) / 1e4;

  const trObs = recent.filter((i) => ebt[i] > 0).map((i) => tax[i] / ebt[i]);
  let tr: number;
  if (trObs.length) {
    tr = clamp(avg(trObs), 0.05, 0.35);
    B.tax_rate = `Average effective tax rate (tax / pre-tax income) over ${yrsTxt}: ${trObs.map(pctStr).join(", ")} (clamped 5%-35%).`;
  } else {
    tr = 0.21;
    B.tax_rate = "Pre-tax losses in recent years: US statutory 21% assumed.";
  }
  V.tax_rate = Math.round(tr * 1e4) / 1e4;
  const mtr = marginalTaxRate(ds.profile.currency);
  V.terminal_tax_rate = mtr;
  B.terminal_tax_rate = `Marginal statutory rate for ${ds.profile.currency} reporters (${pctStr(mtr)}); the effective rate converges to it by the final forecast year, since low effective rates rarely persist forever.`;
  // NOL: roll the loss carryforward through history (losses add, profits consume).
  let nol = 0;
  for (let i = 0; i < n; i++) nol = ebt[i] < 0 ? nol - ebt[i] : Math.max(0, nol - ebt[i]);
  V.nol_opening = Math.round(nol * 10) / 10;
  B.nol_opening = nol > 0 ? `Cumulative pre-tax losses less later profits over the available history = ${nol.toFixed(0)}m (an approximation — actual NOL depends on jurisdiction rules).` : "No accumulated pre-tax losses in the available history.";
  V.nol_usage_cap = 0.8;
  B.nol_usage_cap = "NOLs offset at most 80% of taxable income in any year (US post-2017 rule; conservative default elsewhere).";

  // ---- working capital (last fiscal year) ----
  const days = (num: number, den: number) => (den > 0 ? clamp((365 * num) / den, 0, 400) : 0);
  V.dso = Math.round(days(ar[L], rev[L]) * 10) / 10;
  B.dso = `FY${fy[L]}: receivables ${ar[L].toFixed(0)} / revenue ${rev[L].toFixed(0)} x 365.`;
  V.dio = Math.round(days(inv[L], cogs[L]) * 10) / 10;
  B.dio = `FY${fy[L]}: inventory ${inv[L].toFixed(0)} / cost of revenue ${cogs[L].toFixed(0)} x 365.`;
  V.dpo = Math.round(days(ap[L], cogs[L]) * 10) / 10;
  B.dpo = `FY${fy[L]}: payables ${ap[L].toFixed(0)} / cost of revenue ${cogs[L].toFixed(0)} x 365.`;
  const oca = ca[L] - csti[L] - ar[L] - inv[L];
  const ocl = cl[L] - ap[L] - std[L];
  const onca = ta[L] - ca[L] - ppe[L] - gwi[L];
  const oncl = tl[L] - cl[L] - ltd[L];
  for (const [key, val, lab] of [
    ["other_ca_pct", oca, "other current assets"],
    ["other_cl_pct", ocl, "other current liabilities"],
    ["other_nca_pct", onca, "other non-current assets"],
    ["other_ncl_pct", oncl, "other non-current liabilities"],
  ] as [string, number, string][]) {
    const pct = rev[L] > 0 ? clamp(val / rev[L], 0, 5) : 0;
    V[key] = Math.round(pct * 1e4) / 1e4;
    B[key] = `FY${fy[L]}: ${lab} ${val.toFixed(0)} / revenue ${rev[L].toFixed(0)} = ${pctStr(pct)}, held constant.`;
  }

  // ---- capital allocation ----
  const poObs = recent.filter((i) => ni[i] > 0).map((i) => -div[i] / ni[i]);
  const po = poObs.length ? clamp(avg(poObs), 0, 1.0) : 0;
  V.payout_ratio = Math.round(po * 1e4) / 1e4;
  B.payout_ratio = poObs.length
    ? `Average dividends paid / net income over ${yrsTxt}: ${poObs.map(pctStr).join(", ")}.`
    : "No dividend history.";
  let sc: number;
  if (n >= 2 && dsh[0] > 0) {
    sc = clamp(Math.pow(dsh[L] / dsh[0], 1 / (n - 1)) - 1, -0.05, 0.05);
    B.share_change = `CAGR of diluted shares FY${fy[0]}-FY${fy[L]}: ${dsh[0].toFixed(0)}m to ${dsh[L].toFixed(0)}m = ${pctStr(sc)} p.a. (clamped +/-5%).`;
  } else {
    sc = 0;
    B.share_change = "Insufficient history: share count held flat.";
  }
  V.share_change = Math.round(sc * 1e4) / 1e4;
  const bbHist = recent.map((i) => -(bb[i] + si[i]));
  const bbDef = Math.max(0, avg(bbHist));
  V.buybacks = Array(years).fill(Math.round(bbDef * 10) / 10);
  B.buybacks = `Average net repurchases over ${yrsTxt}: ${bbHist.map((x) => x.toFixed(0)).join(", ")} (held flat; set to 0 to retain cash).`;
  V.net_debt_issuance = Array(years).fill(0);
  B.net_debt_issuance = "Debt held constant (maturities assumed refinanced); enter negative values to model repayment.";
  V.other_nonop = Array(years).fill(0);
  B.other_nonop = "Non-recurring / other non-operating items assumed nil in the forecast.";

  // ---- terminal ----
  const tg = Math.round(Math.min(0.025, Math.max(rf, 0)) * 1e4) / 1e4;
  V.terminal_growth = tg;
  B.terminal_growth = "Long-run nominal growth of 2.5%, capped at the risk-free rate (a firm cannot outgrow the economy forever).";
  const evNow = mcap + bookDebt - csti[L];
  const ltmMult = ebitda[L] > 0 ? evNow / ebitda[L] : 12;
  V.exit_multiple = Math.round(clamp(ltmMult, 4, 30) * 10) / 10;
  B.exit_multiple = `Current EV / LTM EBITDA: (${mcap.toFixed(0)} + ${bookDebt.toFixed(0)} - ${csti[L].toFixed(0)}) / ${ebitda[L].toFixed(0)} = ${ltmMult.toFixed(1)}x (clamped 4x-30x).`;
  V.tv_method = 1;
  B.tv_method = "Gordon growth is the primary method; the exit multiple is shown as a cross-check.";
  V.terminal_roic_spread = 0.02;
  B.terminal_roic_spread = "Terminal ROIC = WACC + 2%: competitive advantages fade, so growth is not free — reinvestment rate = g / ROIC (Damodaran / McKinsey value-driver formula). Set to 0 for a no-moat firm.";
  V.mid_year = 1;
  B.mid_year = "Cash flows arrive through the year, so they are discounted from mid-year.";
  V.sbc_addback = 0;
  B.sbc_addback = "SBC is treated as a real economic cost (not added back), per Damodaran's recommendation.";

  // ---- operating drivers ----
  const gObs = Array.from({ length: n - 1 }, (_, i) => i + 1).filter((i) => rev[i - 1] > 0).map((i) => rev[i] / rev[i - 1] - 1);
  let start: number;
  if (gObs.length >= 1) {
    const baseI = Math.max(0, L - 3);
    const cagr = L > 0 && rev[baseI] > 0 && rev[L] > 0 ? Math.pow(rev[L] / rev[baseI], 1 / Math.min(3, L)) - 1 : gObs[gObs.length - 1];
    start = clamp(cagr, -0.2, 0.4);
    const histTxt = gObs.map((g, i) => `FY${fy[i + 1]} ${pctStr(g)}`).join(", ");
    B.rev_growth = `Starts at the ${Math.min(3, L)}-year revenue CAGR (${pctStr(cagr)}, clamped -20%..+40%) and fades linearly to the terminal growth rate (${pctStr(tg)}) by the final forecast year. Historical growth: ${histTxt}.`;
  } else {
    start = 0.05;
    B.rev_growth = "Single year of history: 5% growth fading to terminal growth.";
  }
  V.rev_growth = Array.from({ length: years }, (_, j) => Math.round((start + (tg - start) * (years > 1 ? j / (years - 1) : 1)) * 1e4) / 1e4);

  function ratioAvg(num: number[], den: number[], label: string, key: string, lo: number, hi: number) {
    const obs = recent.filter((i) => den[i] > 0).map((i) => num[i] / den[i]);
    const val = obs.length ? clamp(avg(obs), lo, hi) : 0;
    V[key] = Array(years).fill(Math.round(val * 1e4) / 1e4);
    B[key] = obs.length
      ? `Average ${label} over ${yrsTxt}: ${obs.map(pctStr).join(", ")} (held flat).`
      : `No history for ${label}.`;
  }

  ratioAvg(rev.map((r, i) => r - cogs[i]), rev, "gross margin", "gross_margin", -1, 1);
  ratioAvg(sga, rev, "SG&A % revenue", "sga_pct", 0, 2);
  ratioAvg(rnd, rev, "R&D % revenue", "rnd_pct", 0, 2);
  const otherOpex = rev.map((r, i) => r - cogs[i] - sga[i] - rnd[i] - ebit[i]);
  ratioAvg(otherOpex, rev, "other operating expense % revenue (incl. reconciling items)", "other_opex_pct", -1, 2);
  const daObs = recent.filter((i) => i >= 1 && ppe[i - 1] > 0).map((i) => da[i] / ppe[i - 1]);
  const daRate = daObs.length ? clamp(avg(daObs), 0.02, 1.0) : ppe[L] > 0 ? clamp(da[L] / ppe[L], 0.02, 1.0) : 0.1;
  V.da_pct = Array(years).fill(Math.round(daRate * 1e4) / 1e4);
  B.da_pct = daObs.length
    ? `Average D&A / opening net PP&E over recent years (held flat, so D&A grows with the asset base).`
    : "D&A / net PP&E of the latest year.";
  const cxObs = recent.filter((i) => rev[i] > 0).map((i) => -capex[i] / rev[i]);
  const cxAvg = cxObs.length ? clamp(avg(cxObs), 0, 2) : 0;
  const cxLast = cxObs.length ? clamp(cxObs[cxObs.length - 1], 0, 2) : 0;
  V.capex_pct = Array.from({ length: years }, (_, j) => Math.round((cxLast + (cxAvg - cxLast) * (j / Math.max(years - 1, 1))) * 1e4) / 1e4);
  B.capex_pct = cxObs.length
    ? `Fades linearly from the latest year's capex / revenue (${pctStr(cxLast)}) to the ${cxObs.length}-year average (${pctStr(cxAvg)}).`
    : "No capex history.";
  ratioAvg(sbc, rev, "SBC % revenue", "sbc_pct", 0, 1);

  // ---- revenue drivers: volume x price decomposition (informational until driver_mode = 1) ----
  V.driver_mode = 0;
  B.driver_mode = "0 = the revenue-growth vector drives revenue. 1 = (1 + volume growth) x (1 + price growth) - 1 drives revenue (defaults reproduce the same path, so you can flex volume and price independently).";
  const inflation = (ds.market.countryRiskPremium ?? 0) > 0 ? 0.04 : 0.025;
  const growthVec = V.rev_growth as number[];
  V.price_growth = growthVec.map((g) => Math.round(clamp(g, 0, inflation) * 1e4) / 1e4);
  V.volume_growth = growthVec.map((g, j) => (1 + g) / (1 + (V.price_growth as number[])[j]) - 1); // unrounded so the product reproduces total growth exactly
  B.price_growth = `Price / mix growth: revenue growth capped at ${pctStr(inflation)} (an inflation-like pass-through), floored at 0.`;
  B.volume_growth = "Volume growth = the residual so that (1 + volume) x (1 + price) equals total revenue growth.";

  // ---- long-run margin ----
  const marginObs = recent.filter((i) => rev[i] > 0).map((i) => ebit[i] / rev[i]);
  const tm = marginObs.length ? avg(marginObs) : 0;
  V.target_ebit_margin = Math.round(tm * 1e4) / 1e4;
  B.target_ebit_margin = `Average EBIT margin over ${yrsTxt} (${pctStr(tm)}). With the fade switched on, the projected EBIT margin moves linearly from its starting level to this target by the final year (use a 6-year lookback for cyclicals to capture a mid-cycle margin).`;
  V.margin_fade = 0;
  B.margin_fade = "Off by default: margins are held at the recent average. Turn on to converge margins to the long-run target.";

  // ---- minimum cash / revolver ----
  const cashPct = recent.filter((i) => rev[i] > 0).map((i) => csti[i] / rev[i]);
  const mc = cashPct.length ? clamp(avg(cashPct) * 0.5, 0.01, 0.1) : 0.02;
  V.min_cash_pct = Math.round(mc * 1e4) / 1e4;
  B.min_cash_pct = `Half of recent average cash & short-term investments / revenue (${cashPct.length ? pctStr(avg(cashPct)) : "n/a"}), clamped 1%-10%. If projected cash would fall below this, an automatic revolver draws the gap (and is repaid from later surplus).`;

  // ---- equity bridge items ----
  const lastF = P[L].fields;
  const fld = (k: string) => Math.max(0, Number(lastF[k as keyof typeof lastF]) || 0) / M;
  V.minority_interest = Math.round(fld("minority_interest") * 10) / 10;
  B.minority_interest = "Non-controlling interest at the latest balance sheet (book value; a market-value estimate would use the subsidiary's P/E or P/B).";
  V.preferred_equity = Math.round(fld("preferred_equity") * 10) / 10;
  B.preferred_equity = "Preferred stock at the latest balance sheet.";
  V.pension_deficit = Math.round(fld("pension_liability") * 10) / 10;
  B.pension_deficit = "Reported pension / post-retirement liability (gross; tax-effect it if material).";
  V.extra_debt_like = 0;
  const leaseAmt = fld("lease_liabilities");
  B.extra_debt_like = `Zero by default. Reported lease liabilities (${leaseAmt.toFixed(0)}m) are already inside the reported debt figures (Yahoo's "debt & capital lease obligation"); add operating leases here only if they are not.`;
  V.lt_investments = Math.round(fld("lt_investments") * 10) / 10;
  B.lt_investments = "Long-term / equity-method investments, whose income is not in EBIT: added to equity value at book.";

  // ---- dilution ----
  V.use_dilution = 1;
  B.use_dilution = "Treasury-stock method: options add shares only to the extent they are in the money; RSUs and in-the-money converts add in full.";
  V.options_outstanding = 0;
  B.options_outstanding = "Option counts are not available from the free data source — enter from the company's latest annual report (stock-based compensation note).";
  V.option_strike = 0;
  B.option_strike = "Weighted-average exercise price of the outstanding options.";
  const dilProxy = Math.max(0, (dsh[L] || 0) - (col("basic_shares")[L] || 0));
  V.rsus = Math.round(dilProxy * 10) / 10;
  B.rsus = `Proxy: FY${fy[L]} weighted-average diluted less basic shares (${dilProxy.toFixed(1)}m) — the dilution the company itself reports, treated as fully dilutive.`;
  V.convertible_shares = 0;
  B.convertible_shares = "Shares issuable on conversion of convertible debt / preferred, if any.";
  V.convert_price = 0;
  B.convert_price = "Conversion price; converts count only when the implied share price exceeds it.";

  // ---- residual income (financials) ----
  const eqCol = P.map((p) => (Number(p.fields.stockholders_equity) || Number(p.fields.total_equity) || (Number(p.fields.total_assets) - Number(p.fields.total_liabilities)) || 0) / M);
  const roeObs = recent.filter((i) => i >= 1 && eqCol[i - 1] > 0).map((i) => ni[i] / ((eqCol[i] + eqCol[i - 1]) / 2));
  const roe = roeObs.length ? clamp(avg(roeObs), -0.1, 0.6) : 0.1;
  V.ri_roe = Math.round(roe * 1e4) / 1e4;
  B.ri_roe = `Average return on average equity over ${yrsTxt}: ${roeObs.map(pctStr).join(", ") || "n/a"}.`;
  V.ri_payout = Math.round(po * 1e4) / 1e4;
  B.ri_payout = "Recent average dividend payout; retained earnings fund book-value growth (g = retention x ROE).";
  V.ri_terminal_spread = 0.01;
  B.ri_terminal_spread = "ROE fades linearly to cost of equity + 1% by the final year, and the terminal residual income then grows at the terminal growth rate.";

  return { years, values: V, basis: B, overridden };
}

export function applyOverrides(A: Assumptions, overrides: Record<string, number | number[]>): Assumptions {
  const values = { ...A.values };
  const overridden = [...A.overridden];
  let years = A.years;

  if (overrides.projection_years != null) {
    const ny = Math.round(clamp(Number(overrides.projection_years), 3, 10));
    if (ny !== years) {
      for (const s of ASSUMPTION_SPECS) {
        if (s.kind === "vector") {
          const v = values[s.key] as number[];
          const grown = v.length >= ny ? v.slice(0, ny) : [...v, ...Array(ny - v.length).fill(v[v.length - 1] ?? 0)];
          values[s.key] = grown;
        }
      }
      values.projection_years = ny;
      overridden.push("projection_years");
      years = ny;
    }
  }

  for (const [key, raw] of Object.entries(overrides)) {
    if (key === "projection_years") continue;
    const spec = SPEC_BY_KEY.get(key);
    if (!spec) continue;
    const conv = (x: number) => {
      if (spec.lo != null && x < spec.lo) throw new Error(`${spec.label}: ${x} is below the minimum ${spec.lo}`);
      if (spec.hi != null && x > spec.hi) throw new Error(`${spec.label}: ${x} is above the maximum ${spec.hi}`);
      return spec.fmt === "int" ? Math.round(x) : x;
    };
    if (spec.kind === "vector") {
      let vals = Array.isArray(raw) ? raw.map(conv) : Array(years).fill(conv(raw as number));
      if (vals.length < years) vals = [...vals, ...Array(years - vals.length).fill(vals[vals.length - 1] ?? 0)];
      values[key] = vals.slice(0, years);
    } else {
      values[key] = conv(Array.isArray(raw) ? raw[0] : raw);
    }
    overridden.push(key);
  }

  return { years, values, basis: A.basis, overridden: [...new Set(overridden)] };
}
