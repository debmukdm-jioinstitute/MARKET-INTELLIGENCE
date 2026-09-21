/**
 * Financial model computation — beta regression, WACC, an integrated 3-statement
 * projection (income statement / balance sheet / cash flow all roll forward
 * year over year), unlevered-FCF DCF valuation (Gordon growth + exit multiple),
 * sensitivity tables and a ratio suite.
 *
 * Ported from FinTea's builder.py (Python), computing values directly instead
 * of building an Excel formula-cell graph — same methodology, same clamps.
 */
import type {
  Assumptions,
  BetaResult,
  DcfResult,
  FinancialDataset,
  ModelResult,
  ProjectionYear,
  RatioRow,
  SensitivityTable,
  WaccResult,
} from "@/lib/models/types";

type Row = Record<string, number>;

function iferror(fn: () => number): number {
  try {
    const v = fn();
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Beta regression
// ---------------------------------------------------------------------------

function linreg(y: number[], x: number[]) {
  const n = Math.min(y.length, x.length);
  const my = y.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const mx = x.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
    sxy += (x[i] - mx) * (y[i] - my);
  }
  const slope = sxx > 0 ? sxy / sxx : 0;
  const intercept = my - slope * mx;
  const r = sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
  return { n, slope, intercept, rSquared: r * r, correl: r };
}

function monthlyReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) out.push(closes[i] / closes[i - 1] - 1);
  return out;
}

export function computeBeta(ds: FinancialDataset, taxRate: number, deCurrent: number, deTarget: number): BetaResult {
  const stockReturns = monthlyReturns(ds.stockPrices.closes);
  const indexReturns = monthlyReturns(ds.indexPrices.closes);
  const { n, slope: rawBeta } = linreg(stockReturns, indexReturns);
  const adjBeta = 0.67 * rawBeta + 0.33;
  const fallback = n < 24 || rawBeta < -1 || rawBeta > 4;
  const leveredBetaUsed = fallback ? 1 : adjBeta; // use_blume defaults to 1 (see assumptions)
  const unleveredBeta = leveredBetaUsed / (1 + (1 - taxRate) * deCurrent);
  const selectedBeta = unleveredBeta * (1 + (1 - taxRate) * deTarget);
  return { nObs: n, rawBeta, adjBeta, fallback, leveredBetaUsed, deCurrent, unleveredBeta, selectedBeta };
}

// ---------------------------------------------------------------------------
// WACC
// ---------------------------------------------------------------------------

export function computeWacc(ds: FinancialDataset, A: Assumptions, betaSelectedFn: (deCurrent: number, deTarget: number) => number): { wacc: WaccResult; beta: BetaResult } {
  const L = ds.periods.length - 1;
  const last = ds.periods[L].fields;
  const price = A.values.price as number;
  const shares = A.values.shares_outstanding as number;
  const marketCap = price * shares;
  const debt = ((last.short_term_debt ?? 0) + (last.long_term_debt ?? 0)) / 1e6;
  const deCurrent = iferror(() => debt / marketCap);
  const dvCurrent = iferror(() => debt / (debt + marketCap));
  const dvTarget = A.values.target_debt_weight as number;
  const evTarget = 1 - dvTarget;
  const deTarget = iferror(() => dvTarget / evTarget);

  const taxRate = A.values.tax_rate as number;
  const beta = computeBeta(ds, taxRate, deCurrent, deTarget);
  void betaSelectedFn; // kept for API symmetry; beta computed directly above

  const rf = A.values.risk_free as number;
  const erp = A.values.erp as number;
  const sizePrem = A.values.size_premium as number;
  const costOfEquity = rf + beta.selectedBeta * erp + sizePrem;

  const kd = A.values.cost_of_debt as number;
  const costOfDebtAfterTax = kd * (1 - taxRate);

  const wacc = evTarget * costOfEquity + dvTarget * costOfDebtAfterTax;

  return {
    beta,
    wacc: { marketCap, debt, deCurrent, dvCurrent, dvTarget, evTarget, deTarget, costOfEquity, costOfDebtAfterTax, wacc },
  };
}

// ---------------------------------------------------------------------------
// Integrated 3-statement projection
// ---------------------------------------------------------------------------

/** Builds one row per historical + projected fiscal year, with every IS/BS/CF line the DCF and ratios need. */
function buildRows(ds: FinancialDataset, A: Assumptions): { rows: Row[]; n: number; years: number; labels: string[] } {
  const n = ds.periods.length;
  const years = A.years;
  const L = n - 1;
  const M = 1e6;
  const vec = (key: string, j: number) => (A.values[key] as number[])[j];
  const sca = (key: string) => A.values[key] as number;

  const rows: Row[] = [];

  for (let p = 0; p < n + years; p++) {
    const r: Row = {};
    const isHist = p < n;
    const prev = p > 0 ? rows[p - 1] : undefined;
    const j = p - n; // projection-year index (only meaningful when !isHist)

    if (isHist) {
      const f = ds.periods[p].fields;
      const g = (k: string) => (f[k as keyof typeof f] ?? 0) as number / M;
      r.revenue = g("revenue");
      r.cogs = g("cogs");
      r.gross_profit = r.revenue - r.cogs;
      r.sga = g("sga");
      r.rnd = g("rnd");
      r.other_opex = r.gross_profit - r.sga - r.rnd - g("operating_income");
      r.total_opex = r.sga + r.rnd + r.other_opex;
      r.ebit = r.gross_profit - r.total_opex;
      r.da = g("da");
      r.ebitda = r.ebit + r.da;
      r.interest_expense = g("interest_expense");
      r.interest_income = g("interest_income");
      r.other_nonop = g("pretax_income") - (r.ebit - r.interest_expense + r.interest_income);
      r.ebt = r.ebit - r.interest_expense + r.interest_income + r.other_nonop;
      r.tax = g("tax");
      r.other_ni = g("net_income") - (r.ebt - r.tax);
      r.net_income = r.ebt - r.tax + r.other_ni;
      r.diluted_shares = g("diluted_shares");
      r.eps = iferror(() => r.net_income / r.diluted_shares);

      r.cash = g("cash");
      r.sti = g("cash_and_sti") - g("cash");
      r.receivables = g("receivables");
      r.inventory = g("inventory");
      r.other_ca = g("current_assets") - g("cash_and_sti") - g("receivables") - g("inventory");
      r.total_current_assets = r.cash + r.sti + r.receivables + r.inventory + r.other_ca;
      r.ppe = g("ppe");
      r.goodwill_intangibles = g("goodwill_intangibles");
      r.other_nca = g("total_assets") - g("current_assets") - g("ppe") - g("goodwill_intangibles");
      r.total_assets = r.total_current_assets + r.ppe + r.goodwill_intangibles + r.other_nca;
      r.payables = g("payables");
      r.short_term_debt = g("short_term_debt");
      r.other_cl = g("current_liabilities") - g("payables") - g("short_term_debt");
      r.total_current_liabilities = r.payables + r.short_term_debt + r.other_cl;
      r.long_term_debt = g("long_term_debt");
      r.other_ncl = g("total_liabilities") - g("current_liabilities") - g("long_term_debt");
      r.total_liabilities = r.total_current_liabilities + r.long_term_debt + r.other_ncl;
      r.total_equity = g("total_assets") - g("total_liabilities");
      r.total_liabilities_equity = r.total_liabilities + r.total_equity;
      r.total_debt = r.short_term_debt + r.long_term_debt;
      r.cash_sti = r.cash + r.sti;
      r.net_debt = r.total_debt - r.cash_sti;

      r.cf_net_income = g("net_income");
      r.cf_da = g("da");
      r.cf_sbc = g("sbc");
      r.change_wc = g("change_wc");
      r.other_operating = g("cfo") - r.cf_net_income - r.cf_da - r.cf_sbc - r.change_wc;
      r.cfo = r.cf_net_income + r.cf_da + r.cf_sbc + r.change_wc + r.other_operating;
      r.capex = g("capex");
      r.other_investing = g("cfi") - r.capex;
      r.cfi = r.capex + r.other_investing;
      r.net_debt_issuance = g("debt_issued") + g("debt_repaid");
      r.dividends = g("dividends");
      r.buybacks = g("buybacks") + g("stock_issued");
      r.other_financing = g("cff") - r.net_debt_issuance - r.dividends - r.buybacks;
      r.cff = r.net_debt_issuance + r.dividends + r.buybacks + r.other_financing;
      r.fcf = r.cfo + r.capex;
    } else {
      const p0 = prev!;
      r.revenue = p0.revenue * (1 + vec("rev_growth", j));
      r.cogs = r.revenue * (1 - vec("gross_margin", j));
      r.gross_profit = r.revenue - r.cogs;
      r.sga = r.revenue * vec("sga_pct", j);
      r.rnd = r.revenue * vec("rnd_pct", j);
      r.other_opex = r.revenue * vec("other_opex_pct", j);
      r.total_opex = r.sga + r.rnd + r.other_opex;
      r.ebit = r.gross_profit - r.total_opex;
      r.da = p0.ppe * vec("da_pct", j);
      r.ebitda = r.ebit + r.da;
      r.interest_expense = p0.total_debt * sca("cost_of_debt");
      r.interest_income = p0.cash_sti * sca("cash_yield");
      r.other_nonop = vec("other_nonop", j);
      r.ebt = r.ebit - r.interest_expense + r.interest_income + r.other_nonop;
      r.tax = r.ebt * sca("tax_rate");
      r.other_ni = 0;
      r.net_income = r.ebt - r.tax + r.other_ni;
      r.diluted_shares = p0.diluted_shares * (1 + sca("share_change"));
      r.eps = iferror(() => r.net_income / r.diluted_shares);

      r.receivables = (r.revenue * sca("dso")) / 365;
      r.inventory = (r.cogs * sca("dio")) / 365;
      r.other_ca = r.revenue * sca("other_ca_pct");
      r.payables = (r.cogs * sca("dpo")) / 365;
      r.other_cl = r.revenue * sca("other_cl_pct");
      r.capex = -r.revenue * vec("capex_pct", j);
      r.net_debt_issuance = vec("net_debt_issuance", j);
      r.long_term_debt = p0.long_term_debt + r.net_debt_issuance;
      r.short_term_debt = p0.short_term_debt;
      r.other_nca = r.revenue * sca("other_nca_pct");
      r.other_ncl = r.revenue * sca("other_ncl_pct");
      r.goodwill_intangibles = p0.goodwill_intangibles;
      r.ppe = p0.ppe - r.capex - r.da; // capex is negative (outflow), so -capex adds to PP&E

      r.cf_sbc = r.revenue * vec("sbc_pct", j);
      r.dividends = -r.net_income * sca("payout_ratio");
      r.buybacks = -vec("buybacks", j);
      r.other_financing = 0;
      r.cff = r.net_debt_issuance + r.dividends + r.buybacks + r.other_financing;

      r.change_wc =
        -(r.receivables - p0.receivables + (r.inventory - p0.inventory) + (r.other_ca - p0.other_ca)) +
        (r.payables - p0.payables + (r.other_cl - p0.other_cl));
      r.other_operating = r.other_ncl - p0.other_ncl - (r.other_nca - p0.other_nca);
      r.cf_net_income = r.net_income;
      r.cf_da = r.da;
      r.cfo = r.cf_net_income + r.cf_da + r.cf_sbc + r.change_wc + r.other_operating;
      r.other_investing = 0;
      r.cfi = r.capex + r.other_investing;
      r.fx_other = 0;
      r.net_change_cash = r.cfo + r.cfi + r.cff + r.fx_other;
      r.cash = p0.cash + r.net_change_cash;
      r.sti = p0.sti;

      r.total_current_assets = r.cash + r.sti + r.receivables + r.inventory + r.other_ca;
      r.total_assets = r.total_current_assets + r.ppe + r.goodwill_intangibles + r.other_nca;
      r.total_current_liabilities = r.payables + r.short_term_debt + r.other_cl;
      r.total_liabilities = r.total_current_liabilities + r.long_term_debt + r.other_ncl;
      r.total_equity = p0.total_equity + r.net_income + r.dividends + r.buybacks + r.cf_sbc;
      r.total_liabilities_equity = r.total_liabilities + r.total_equity;
      r.total_debt = r.short_term_debt + r.long_term_debt;
      r.cash_sti = r.cash + r.sti;
      r.net_debt = r.total_debt - r.cash_sti;
      r.fcf = r.cfo + r.capex;
    }
    rows.push(r);
  }

  const labels: string[] = [];
  for (let p = 0; p < n + years; p++) {
    const fy = p < n ? ds.periods[p].fiscalYear : ds.periods[L].fiscalYear + (p - L);
    labels.push(p < n ? `FY${fy}` : `FY${fy}E`);
  }

  return { rows, n, years, labels };
}

// ---------------------------------------------------------------------------
// DCF
// ---------------------------------------------------------------------------

function buildDcf(rows: Row[], n: number, years: number, labels: string[], A: Assumptions, wacc: number): DcfResult {
  const L = n - 1;
  const projIdx = Array.from({ length: years }, (_, i) => n + i);
  const midYear = A.values.mid_year as number;
  const taxRate = A.values.tax_rate as number;
  const sbcAddback = A.values.sbc_addback as number;

  const projected: ProjectionYear[] = [];
  const fcffArr: number[] = [];
  const discPeriods: number[] = [];
  let yearIndex = 0;
  for (const p of projIdx) {
    const r = rows[p];
    yearIndex += 1;
    const nopat = r.ebit * (1 - taxRate);
    const fcff = nopat + r.da + r.capex + r.change_wc + r.other_operating + r.cf_sbc * sbcAddback;
    fcffArr.push(fcff);
    discPeriods.push(yearIndex - 0.5 * midYear);
    projected.push({
      fiscalYear: L + (p - L), label: labels[p],
      revenue: r.revenue, grossProfit: r.gross_profit, ebit: r.ebit, ebitda: r.ebitda,
      nopat, da: r.da, capex: r.capex, changeWc: r.change_wc, sbc: r.cf_sbc, fcff,
      netIncome: r.net_income, eps: r.eps,
    });
  }

  const pvFcff = fcffArr.map((fcff, i) => fcff / (1 + wacc) ** discPeriods[i]);
  const sumPv = pvFcff.reduce((s, v) => s + v, 0);

  const fcffTerminal = fcffArr[fcffArr.length - 1];
  const ebitdaTerminal = rows[projIdx[projIdx.length - 1]].ebitda;
  const g = A.values.terminal_growth as number;
  const mult = A.values.exit_multiple as number;

  const tvGordon = (fcffTerminal * (1 + g)) / (wacc - g);
  const tvExit = ebitdaTerminal * mult;
  const tvDiscPeriodGordon = discPeriods[discPeriods.length - 1];
  const tvDiscPeriodExit = yearIndex;
  const pvTvGordon = tvGordon / (1 + wacc) ** tvDiscPeriodGordon;
  const pvTvExit = tvExit / (1 + wacc) ** tvDiscPeriodExit;
  const tvMethod = A.values.tv_method as number;
  const pvTv = tvMethod === 1 ? pvTvGordon : pvTvExit;

  const enterpriseValue = sumPv + pvTv;
  const lessDebt = -rows[L].total_debt;
  const plusCash = rows[L].cash_sti;
  const equityValue = enterpriseValue + lessDebt + plusCash;
  const shares = A.values.shares_outstanding as number;
  const impliedPrice = equityValue / shares;
  const currentPrice = A.values.price as number;
  const upside = impliedPrice / currentPrice - 1;

  return {
    years: projected,
    discountPeriods: discPeriods,
    pvFcff,
    sumPv,
    fcffTerminal,
    ebitdaTerminal,
    tvGordon,
    tvExit,
    pvTvGordon,
    pvTvExit,
    pvTv,
    enterpriseValue,
    lessDebt,
    plusCash,
    equityValue,
    impliedPrice,
    currentPrice,
    upside,
    tvShareOfEv: iferror(() => pvTv / enterpriseValue),
    impliedExitMultiple: iferror(() => tvGordon / ebitdaTerminal),
    impliedGrowthFromExit: iferror(() => (tvExit * wacc - fcffTerminal) / (tvExit + fcffTerminal)),
  };
}

function buildSensitivity(fcffArr: number[], discPeriods: number[], fcffTerminal: number, ebitdaTerminal: number, wacc: number, lessDebt: number, plusCash: number, shares: number, baseGrowth: number, baseMultiple: number): { gordon: SensitivityTable; exit: SensitivityTable } {
  const waccSteps = [-0.01, -0.005, 0, 0.005, 0.01];
  const multSteps = [-2, -1, 0, 1, 2];
  const growthSteps = [-0.01, -0.005, 0, 0.005, 0.01];
  const waccCols = waccSteps.map((s) => wacc + s);
  const tvDiscPeriodGordon = discPeriods[discPeriods.length - 1];
  const tvDiscPeriodExit = discPeriods.length;

  function priceGordon(w: number, g: number): number | null {
    if (w - g === 0) return null;
    let pv = 0;
    for (let i = 0; i < fcffArr.length; i++) pv += fcffArr[i] / (1 + w) ** discPeriods[i];
    const tv = (fcffTerminal * (1 + g)) / (w - g) / (1 + w) ** tvDiscPeriodGordon;
    return (pv + tv + lessDebt + plusCash) / shares;
  }
  function priceExit(w: number, m: number): number | null {
    let pv = 0;
    for (let i = 0; i < fcffArr.length; i++) pv += fcffArr[i] / (1 + w) ** discPeriods[i];
    const tv = (ebitdaTerminal * m) / (1 + w) ** tvDiscPeriodExit;
    return (pv + tv + lessDebt + plusCash) / shares;
  }

  const gordonGrid = growthSteps.map((gs) => waccCols.map((w) => priceGordon(w, baseGrowth + gs)));
  const exitGrid = multSteps.map((ms) => waccCols.map((w) => priceExit(w, baseMultiple + ms)));

  return {
    gordon: {
      title: "Gordon growth method: terminal growth vs WACC",
      waccSteps: waccCols,
      rowLabel: "Terminal growth",
      rowValues: growthSteps.map((s) => baseGrowth + s),
      grid: gordonGrid,
    },
    exit: {
      title: "Exit multiple method: EV / EBITDA multiple vs WACC",
      waccSteps: waccCols,
      rowLabel: "Exit multiple",
      rowValues: multSteps.map((s) => baseMultiple + s),
      grid: exitGrid,
    },
  };
}

function buildRatios(rows: Row[], n: number, years: number, taxRate: number): RatioRow[] {
  const total = n + years;
  const get = (key: string, p: number) => rows[p]?.[key] ?? 0;
  const at = (fn: (p: number) => number | null, fmt: RatioRow["fmt"], key: string, label: string, section: string): RatioRow => ({
    key, label, section, fmt,
    values: Array.from({ length: total }, (_, p) => {
      const v = fn(p);
      return v == null ? null : iferror(() => v);
    }),
  });

  return [
    at((p) => (p > 0 ? get("revenue", p) / get("revenue", p - 1) - 1 : null), "pct", "r_rev_growth", "Revenue growth", "Growth"),
    at((p) => (p > 0 ? get("ebitda", p) / get("ebitda", p - 1) - 1 : null), "pct", "r_ebitda_growth", "EBITDA growth", "Growth"),
    at((p) => (p > 0 ? get("net_income", p) / get("net_income", p - 1) - 1 : null), "pct", "r_ni_growth", "Net income growth", "Growth"),
    at((p) => get("gross_profit", p) / get("revenue", p), "pct", "r_gross_margin", "Gross margin", "Profitability"),
    at((p) => get("ebitda", p) / get("revenue", p), "pct", "r_ebitda_margin", "EBITDA margin", "Profitability"),
    at((p) => get("ebit", p) / get("revenue", p), "pct", "r_ebit_margin", "EBIT margin", "Profitability"),
    at((p) => get("net_income", p) / get("revenue", p), "pct", "r_net_margin", "Net margin", "Profitability"),
    at((p) => get("net_income", p) / get("total_equity", p), "pct", "r_roe", "Return on equity", "Profitability"),
    at((p) => get("net_income", p) / get("total_assets", p), "pct", "r_roa", "Return on assets", "Profitability"),
    at((p) => {
      const ic = get("total_debt", p) + get("total_equity", p) - get("cash_sti", p);
      return Math.abs(ic) < 0.01 ? 0 : (get("ebit", p) * (1 - taxRate)) / ic;
    }, "pct", "r_roic", "Return on invested capital", "Profitability"),
    at((p) => get("fcf", p) / get("revenue", p), "pct", "r_fcf_margin", "FCF margin", "Cash flow"),
    at((p) => -get("capex", p) / get("revenue", p), "pct", "r_capex_rev", "Capex % of revenue", "Cash flow"),
    at((p) => get("total_current_assets", p) / get("total_current_liabilities", p), "mult", "r_current", "Current ratio", "Liquidity and leverage"),
    at((p) => get("total_debt", p) / get("total_equity", p), "mult", "r_de", "Debt / equity", "Liquidity and leverage"),
    at((p) => get("net_debt", p) / get("ebitda", p), "mult", "r_nd_ebitda", "Net debt / EBITDA", "Liquidity and leverage"),
    at((p) => get("ebit", p) / get("interest_expense", p), "mult", "r_int_cov", "Interest coverage", "Liquidity and leverage"),
    at((p) => get("receivables", p) / get("revenue", p) * 365, "days", "r_dso", "Days sales outstanding", "Working capital"),
    at((p) => get("inventory", p) / get("cogs", p) * 365, "days", "r_dio", "Days inventory outstanding", "Working capital"),
    at((p) => get("payables", p) / get("cogs", p) * 365, "days", "r_dpo", "Days payables outstanding", "Working capital"),
    at((p) => get("eps", p), "price", "r_eps", "Diluted EPS", "Per share"),
    at((p) => get("total_equity", p) / get("diluted_shares", p), "price", "r_bvps", "Book value per share", "Per share"),
    at((p) => get("fcf", p) / get("diluted_shares", p), "price", "r_fcfps", "FCF per share", "Per share"),
  ];
}

// ---------------------------------------------------------------------------
// Top-level orchestration
// ---------------------------------------------------------------------------

export function buildModel(dataset: FinancialDataset, assumptions: Assumptions): ModelResult {
  const { rows, n, years, labels } = buildRows(dataset, assumptions);
  const L = n - 1;

  const { wacc, beta } = computeWacc(dataset, assumptions, () => 0);
  const dcf = buildDcf(rows, n, years, labels, assumptions, wacc.wacc);

  const projIdx = Array.from({ length: years }, (_, i) => n + i);
  const fcffArr = dcf.years.map((y) => y.fcff);
  const sens = buildSensitivity(
    fcffArr,
    dcf.discountPeriods,
    dcf.fcffTerminal,
    dcf.ebitdaTerminal,
    wacc.wacc,
    dcf.lessDebt,
    dcf.plusCash,
    assumptions.values.shares_outstanding as number,
    assumptions.values.terminal_growth as number,
    assumptions.values.exit_multiple as number,
  );

  const ratios = buildRatios(rows, n, years, assumptions.values.tax_rate as number);

  const balanceCheck = Math.abs(rows[L].total_assets - rows[L].total_liabilities_equity);
  const lastProjBalanceCheck = Math.abs(rows[projIdx[projIdx.length - 1]].total_assets - rows[projIdx[projIdx.length - 1]].total_liabilities_equity);
  const checks = [
    {
      label: "Balance sheet balances (historical)",
      value: balanceCheck.toFixed(2),
      pass: balanceCheck < 1,
      why: "Assets must equal liabilities + equity in every historical period.",
    },
    {
      label: "Balance sheet balances (final projection year)",
      value: lastProjBalanceCheck.toFixed(2),
      pass: lastProjBalanceCheck < 1,
      why: "The projected balance sheet is built by construction and should balance to a rounding error.",
    },
    {
      label: "WACC exceeds terminal growth",
      value: `${(wacc.wacc * 100).toFixed(2)}% vs ${((assumptions.values.terminal_growth as number) * 100).toFixed(2)}%`,
      pass: wacc.wacc > (assumptions.values.terminal_growth as number),
      why: "The Gordon growth formula is undefined/negative if WACC does not exceed the terminal growth rate.",
    },
    {
      label: "Beta regression has enough observations",
      value: `${beta.nObs} months`,
      pass: beta.nObs >= 24,
      why: "Fewer than 24 monthly observations makes the beta regression unreliable (beta falls back to 1.0).",
    },
  ];

  return { dataset, assumptions, beta, wacc, dcf, sensitivityGordon: sens.gordon, sensitivityExit: sens.exit, ratios, checks };
}
