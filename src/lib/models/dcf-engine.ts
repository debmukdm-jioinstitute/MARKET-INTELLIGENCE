/**
 * Financial model computation — beta (regression or peer bottom-up), WACC, an
 * integrated 3-statement projection (income statement / balance sheet / cash
 * flow roll forward year over year, with an automatic revolver, NOL tracking
 * and a converging tax rate), an unlevered-FCF DCF with a *normalised*
 * terminal year (reinvestment tied to growth via ROIC), a full equity bridge
 * with treasury-stock dilution, sensitivity tables, ratios and integrity checks.
 *
 * Financial companies (banks / insurers / NBFCs) are routed to the residual
 * income model in residual-income.ts.
 *
 * Ported from FinTea's builder.py (Python), computing values directly instead
 * of building an Excel formula-cell graph — same methodology, then extended.
 */
import { marketValueOfDebt } from "@/lib/models/capital";
import { runDataQuality } from "@/lib/models/quality";
import { buildResidualIncome } from "@/lib/models/residual-income";
import { iferror, linreg, monthlyReturns } from "@/lib/models/stats";
import type {
  Assumptions,
  BetaResult,
  BridgeResult,
  DcfResult,
  DilutionResult,
  FinancialDataset,
  ModelResult,
  ModelShift,
  ProjectionYear,
  RatioRow,
  SensitivityTable,
  TerminalResult,
  WaccResult,
} from "@/lib/models/types";

export type Row = Record<string, number>;

export { iferror };

const M = 1e6;

// ---------------------------------------------------------------------------
// Assumption shifts (scenario / Monte Carlo / tornado support)
// ---------------------------------------------------------------------------

export function applyShift(A: Assumptions, shift?: ModelShift): Assumptions {
  if (!shift || (!shift.growth && !shift.margin && !shift.terminalGrowth)) return A;
  const values = { ...A.values };
  if (shift.growth) {
    const key = (A.values.driver_mode as number) === 1 ? "volume_growth" : "rev_growth";
    values[key] = (A.values[key] as number[]).map((g) => g + shift.growth!);
  }
  if (shift.margin) {
    values.other_opex_pct = (A.values.other_opex_pct as number[]).map((x) => x - shift.margin!);
    values.target_ebit_margin = (A.values.target_ebit_margin as number) + shift.margin;
    values.ri_roe = (A.values.ri_roe as number) + shift.margin;
  }
  if (shift.terminalGrowth) values.terminal_growth = (A.values.terminal_growth as number) + shift.terminalGrowth;
  return { ...A, values };
}

// ---------------------------------------------------------------------------
// Beta
// ---------------------------------------------------------------------------

export function computeBeta(
  ds: FinancialDataset,
  taxRate: number,
  deCurrent: number,
  deTarget: number,
  useBlume = true,
  peerBeta: number | null = null,
  nPeers = 0,
  /** Financial companies: debt is operating (deposits, borrowings), so beta is NOT unlevered / relevered — the levered beta is used directly. */
  financialLevered: number | null | "own" = null,
): BetaResult {
  const stockReturns = monthlyReturns(ds.stockPrices.closes);
  const indexReturns = monthlyReturns(ds.indexPrices.closes);
  const { n, slope: rawBeta } = linreg(stockReturns, indexReturns);
  const adjBeta = 0.67 * rawBeta + 0.33;
  const fallback = n < 24 || rawBeta < -1 || rawBeta > 4;
  const leveredBetaUsed = fallback ? 1 : useBlume ? adjBeta : rawBeta;
  const ownUnlevered = leveredBetaUsed / (1 + (1 - taxRate) * deCurrent);
  if (financialLevered !== null) {
    const lev = financialLevered === "own" ? leveredBetaUsed : financialLevered;
    return {
      nObs: n, rawBeta, adjBeta, fallback, leveredBetaUsed, deCurrent, unleveredBeta: lev, selectedBeta: lev,
      method: financialLevered === "own" ? "regression" : "peer", peerUnlevered: financialLevered === "own" ? null : lev, nPeers,
    };
  }
  const usePeer = peerBeta != null;
  const unleveredBeta = usePeer ? peerBeta! : ownUnlevered;
  const selectedBeta = unleveredBeta * (1 + (1 - taxRate) * deTarget);
  return {
    nObs: n, rawBeta, adjBeta, fallback, leveredBetaUsed, deCurrent, unleveredBeta, selectedBeta,
    method: usePeer ? "peer" : "regression", peerUnlevered: peerBeta, nPeers,
  };
}

// ---------------------------------------------------------------------------
// WACC
// ---------------------------------------------------------------------------

export function computeWacc(ds: FinancialDataset, A: Assumptions, waccShift = 0): { wacc: WaccResult; beta: BetaResult } {
  const L = ds.periods.length - 1;
  const last = ds.periods[L].fields;
  const price = A.values.price as number;
  const shares = A.values.shares_outstanding as number;
  const marketCap = price * shares;
  const bookDebt = ((last.short_term_debt ?? 0) + (last.long_term_debt ?? 0)) / M;
  const kd = A.values.cost_of_debt as number;
  // Market value of debt for the capital-structure weights (Damodaran); book value is used in the equity bridge.
  const debt = marketValueOfDebt(bookDebt, (Number(last.interest_expense) || 0) / M, kd, A.values.debt_maturity as number);
  const deCurrent = iferror(() => debt / marketCap);
  const dvCurrent = iferror(() => debt / (debt + marketCap));
  const dvTarget = A.values.target_debt_weight as number;
  const evTarget = 1 - dvTarget;
  const deTarget = iferror(() => dvTarget / evTarget);

  const taxRate = A.values.tax_rate as number;
  const peerBeta = (A.values.beta_method as number) === 2 ? ds.peers?.medianUnleveredBeta ?? null : null;
  const isFin = (A.values.model_type as number) === 2;
  const finLevered = isFin ? ((A.values.beta_method as number) === 2 && ds.peers?.medianLeveredBeta != null ? ds.peers.medianLeveredBeta : "own") : null;
  const beta = computeBeta(ds, taxRate, deCurrent, deTarget, (A.values.use_blume as number) !== 0, peerBeta, ds.peers?.peers.length ?? 0, finLevered);

  const rf = A.values.risk_free as number;
  const erp = (A.values.erp as number) + ((A.values.country_risk_premium as number) ?? 0);
  const sizePrem = A.values.size_premium as number;
  const costOfEquity = rf + beta.selectedBeta * erp + sizePrem + waccShift;

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

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Tax on a profit stream with an NOL pool: returns [tax, closingNol]. */
function taxWithNol(profit: number, rate: number, nolOpen: number, cap: number): [number, number] {
  if (profit <= 0) return [0, nolOpen - profit];
  const used = Math.min(nolOpen, cap * profit);
  return [(profit - used) * rate, nolOpen - used];
}

/** Builds one row per historical + projected fiscal year, with every IS/BS/CF line the DCF and ratios need. */
export function buildRows(ds: FinancialDataset, A: Assumptions): { rows: Row[]; n: number; years: number; labels: string[] } {
  const n = ds.periods.length;
  const years = A.years;
  const L = n - 1;
  const sca = (key: string) => A.values[key] as number;

  const rows: Row[] = [];

  for (let p = 0; p < n + years; p++) {
    let r: Row = {};
    const isHist = p < n;
    const prev = p > 0 ? rows[p - 1] : undefined;
    const j = p - n; // projection-year index (only meaningful when !isHist)

    if (isHist) {
      const f = ds.periods[p].fields;
      const g = (k: string) => ((f[k as keyof typeof f] ?? 0) as number) / M;
      r.revenue = g("revenue");
      r.cogs = g("cogs");
      r.gross_profit = r.revenue - r.cogs;
      r.sga = g("sga");
      r.rnd = g("rnd");
      r.other_opex = r.gross_profit - r.sga - r.rnd - g("operating_income");
      r.total_opex = r.sga + r.rnd + r.other_opex;
      r.ebit = r.gross_profit - r.total_opex;
      r.da = g("da") || g("da_cf");
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
      r.revolver = 0;
      r.other_cl = g("current_liabilities") - g("payables") - g("short_term_debt");
      r.total_current_liabilities = r.payables + r.short_term_debt + r.revolver + r.other_cl;
      r.long_term_debt = g("long_term_debt");
      r.other_ncl = g("total_liabilities") - g("current_liabilities") - g("long_term_debt");
      r.total_liabilities = r.total_current_liabilities + r.long_term_debt + r.other_ncl;
      r.total_equity = g("total_assets") - g("total_liabilities");
      r.total_liabilities_equity = r.total_liabilities + r.total_equity;
      r.total_debt = r.short_term_debt + r.long_term_debt + r.revolver;
      r.cash_sti = r.cash + r.sti;
      r.net_debt = r.total_debt - r.cash_sti;

      r.cf_net_income = g("net_income");
      r.cf_da = g("da_cf") || g("da");
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
      r.nol_close = p === L ? sca("nol_opening") : 0;
      r.nol_ebit_close = r.nol_close;
      r.tax_rate_used = iferror(() => r.tax / r.ebt);
      r.tax_ebit = 0;
      r.nopat = r.ebit * (1 - sca("tax_rate"));
    } else {
      r = projectYear(prev!, j, A, years, rows[L]);
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

/** One projected year. Interest is computed on AVERAGE balances, resolved by fixed-point iteration (the model is circular by construction). */
function projectYear(p0: Row, j: number, A: Assumptions, years: number, base: Row): Row {
  const vec = (key: string) => (A.values[key] as number[])[j];
  const sca = (key: string) => A.values[key] as number;
  const t = years > 1 ? (j + 1) / years : 1;

  const r: Row = {};
  // --- operating lines (no circularity) ---
  const growth = sca("driver_mode") === 1 ? (1 + vec("volume_growth")) * (1 + vec("price_growth")) - 1 : vec("rev_growth");
  r.revenue = p0.revenue * (1 + growth);
  r.cogs = r.revenue * (1 - vec("gross_margin"));
  r.gross_profit = r.revenue - r.cogs;
  r.sga = r.revenue * vec("sga_pct");
  r.rnd = r.revenue * vec("rnd_pct");
  r.other_opex = r.revenue * vec("other_opex_pct");
  r.total_opex = r.sga + r.rnd + r.other_opex;
  r.ebit = r.gross_profit - r.total_opex;
  if (sca("margin_fade") === 1 && base.revenue > 0) {
    // converge the EBIT margin linearly from the base year's level to the long-run target
    const desired = lerp(base.ebit / base.revenue, sca("target_ebit_margin"), t);
    r.other_opex += r.ebit - desired * r.revenue;
    r.total_opex = r.sga + r.rnd + r.other_opex;
    r.ebit = r.gross_profit - r.total_opex;
  }
  r.da = p0.ppe * vec("da_pct");
  r.ebitda = r.ebit + r.da;
  r.other_nonop = vec("other_nonop");
  r.diluted_shares = p0.diluted_shares * (1 + sca("share_change"));

  const taxRate = lerp(sca("tax_rate"), sca("terminal_tax_rate"), t);
  r.tax_rate_used = taxRate;

  // unlevered tax (drives NOPAT / FCFF): NOL applies to EBIT
  const [taxEbit, nolEbitClose] = taxWithNol(r.ebit, taxRate, p0.nol_ebit_close ?? 0, sca("nol_usage_cap"));
  r.tax_ebit = taxEbit;
  r.nopat = r.ebit - taxEbit;
  r.nol_ebit_close = nolEbitClose;

  // balance-sheet items that do not depend on interest
  r.receivables = (r.revenue * sca("dso")) / 365;
  r.inventory = (r.cogs * sca("dio")) / 365;
  r.other_ca = r.revenue * sca("other_ca_pct");
  r.payables = (r.cogs * sca("dpo")) / 365;
  r.other_cl = r.revenue * sca("other_cl_pct");
  // capex funds D&A replacement plus PP&E growth in line with revenue (constant capital intensity); no asset sales modelled
  r.capex = sca("capex_mode") === 1 ? -Math.max(0, r.da + (r.revenue * sca("ppe_to_revenue") - p0.ppe)) : -r.revenue * vec("capex_pct");
  r.net_debt_issuance = vec("net_debt_issuance");
  r.long_term_debt = p0.long_term_debt + r.net_debt_issuance;
  r.short_term_debt = p0.short_term_debt;
  r.other_nca = r.revenue * sca("other_nca_pct");
  r.other_ncl = r.revenue * sca("other_ncl_pct");
  r.goodwill_intangibles = p0.goodwill_intangibles;
  r.ppe = p0.ppe - r.capex - r.da; // capex is negative (outflow), so -capex adds to PP&E
  r.cf_sbc = r.revenue * vec("sbc_pct");
  r.buybacks = -vec("buybacks");
  r.other_financing = 0;
  r.change_wc =
    -(r.receivables - p0.receivables + (r.inventory - p0.inventory) + (r.other_ca - p0.other_ca)) +
    (r.payables - p0.payables + (r.other_cl - p0.other_cl));
  r.other_operating = r.other_ncl - p0.other_ncl - (r.other_nca - p0.other_nca);
  r.cf_da = r.da;
  r.other_investing = 0;
  r.cfi = r.capex + r.other_investing;
  r.fx_other = 0;
  r.sti = p0.sti;
  const minCash = sca("min_cash_pct") * r.revenue;
  const kd = sca("cost_of_debt");
  const cy = sca("cash_yield");

  // --- circular block: interest <-> net income <-> cash <-> revolver ---
  let intExp = kd * p0.total_debt;
  let intInc = Math.max(0, p0.cash_sti) * cy;
  for (let it = 0; it < 40; it++) {
    r.interest_expense = intExp;
    r.interest_income = intInc;
    r.ebt = r.ebit - intExp + intInc + r.other_nonop;
    const [tax, nolClose] = taxWithNol(r.ebt, taxRate, p0.nol_close ?? 0, sca("nol_usage_cap"));
    r.tax = tax;
    r.nol_close = nolClose;
    r.other_ni = 0;
    r.net_income = r.ebt - r.tax;
    r.dividends = -Math.max(0, r.net_income) * sca("payout_ratio");
    r.cf_net_income = r.net_income;
    r.cfo = r.cf_net_income + r.cf_da + r.cf_sbc + r.change_wc + r.other_operating;
    // pre-revolver cash, then the revolver plugs any shortfall below minimum cash (and is repaid from later surplus)
    const cffPre = r.net_debt_issuance + r.dividends + r.buybacks + r.other_financing;
    const cashPre = p0.cash + r.cfo + r.cfi + cffPre + r.fx_other;
    const need = minCash - (cashPre + r.sti);
    const revolverClose = Math.max(0, p0.revolver + need);
    r.revolver = revolverClose;
    r.cash = cashPre + (revolverClose - p0.revolver);
    r.total_debt = r.short_term_debt + r.long_term_debt + r.revolver;
    const newExp = (kd * (p0.total_debt + r.total_debt)) / 2;
    const newInc = Math.max(0, (p0.cash_sti + r.cash + r.sti) / 2) * cy;
    if (Math.abs(newExp - intExp) < 1e-9 && Math.abs(newInc - intInc) < 1e-9) break;
    intExp = newExp;
    intInc = newInc;
  }

  r.cff = r.net_debt_issuance + (r.revolver - p0.revolver) + r.dividends + r.buybacks + r.other_financing;
  r.net_change_cash = r.cfo + r.cfi + r.cff + r.fx_other;
  r.eps = iferror(() => r.net_income / r.diluted_shares);

  r.total_current_assets = r.cash + r.sti + r.receivables + r.inventory + r.other_ca;
  r.total_assets = r.total_current_assets + r.ppe + r.goodwill_intangibles + r.other_nca;
  r.total_current_liabilities = r.payables + r.short_term_debt + r.revolver + r.other_cl;
  r.total_liabilities = r.total_current_liabilities + r.long_term_debt + r.other_ncl;
  r.total_equity = p0.total_equity + r.net_income + r.dividends + r.buybacks + r.cf_sbc;
  r.total_liabilities_equity = r.total_liabilities + r.total_equity;
  r.cash_sti = r.cash + r.sti;
  r.net_debt = r.total_debt - r.cash_sti;
  r.fcf = r.cfo + r.capex;
  return r;
}

// ---------------------------------------------------------------------------
// Terminal value, bridge, dilution
// ---------------------------------------------------------------------------

/**
 * Normalised terminal year (year N+1): NOPAT at the marginal tax rate grown by g, with reinvestment
 * sized to fund that growth: FCFF = NOPAT x (1 - g / ROIC), where ROIC = WACC + spread.
 * Negative or zero growth releases no capital (reinvestment floored at 0).
 */
export function terminalYear(ebitN: number, g: number, taxRate: number, wacc: number, roicSpread: number): TerminalResult {
  const ebit1 = ebitN * (1 + g);
  const nopat = ebit1 - Math.max(0, ebit1) * taxRate;
  const roic = wacc + roicSpread;
  const reinvestmentRate = roic > 0 ? Math.min(1, Math.max(0, g) / roic) : 1;
  return { growth: g, taxRate, nopat, roic, reinvestmentRate, fcff: nopat * (1 - reinvestmentRate) };
}

/** Diluted share count via the treasury-stock method at a given share price. */
export function dilutedSharesAtPrice(A: Assumptions, price: number): DilutionResult {
  const basic = A.values.shares_outstanding as number;
  if ((A.values.use_dilution as number) === 0 || !(price > 0)) {
    return { basicShares: basic, dilutedShares: basic, incrementalShares: 0, optionShares: 0, rsuShares: 0, convertShares: 0 };
  }
  const options = A.values.options_outstanding as number;
  const strike = A.values.option_strike as number;
  const optionShares = options > 0 ? options * Math.max(0, 1 - strike / price) : 0; // TSM: buy back with the exercise proceeds
  const rsuShares = A.values.rsus as number;
  const convPrice = A.values.convert_price as number;
  const convertShares = (A.values.convertible_shares as number) > 0 && price > convPrice ? (A.values.convertible_shares as number) : 0;
  const incremental = optionShares + rsuShares + convertShares;
  return { basicShares: basic, dilutedShares: basic + incremental, incrementalShares: incremental, optionShares, rsuShares, convertShares };
}

/** Solves equity value -> price per diluted share (price depends on dilution, which depends on price). */
export function priceFromEquity(A: Assumptions, equityValue: number): { price: number; dilution: DilutionResult } {
  // limited liability: equity cannot be worth less than zero per share (flagged by the "equity value positive" check)
  let price = Math.max(0, equityValue) / (A.values.shares_outstanding as number);
  let d = dilutedSharesAtPrice(A, price);
  for (let i = 0; i < 60; i++) {
    const next = Math.max(0, equityValue) / d.dilutedShares;
    if (Math.abs(next - price) < 1e-9) { price = next; break; }
    price = next;
    d = dilutedSharesAtPrice(A, Math.max(price, 0));
  }
  return { price, dilution: d };
}

export function equityBridge(A: Assumptions, ev: number, debtBook: number, cashSti: number): BridgeResult {
  const v = (k: string) => (A.values[k] as number) ?? 0;
  const lessMinority = -v("minority_interest");
  const lessPreferred = -v("preferred_equity");
  const lessPension = -v("pension_deficit");
  const lessOtherDebtLike = -v("extra_debt_like");
  const plusInvestments = v("lt_investments");
  return {
    enterpriseValue: ev,
    lessDebt: -debtBook,
    lessMinority, lessPreferred, lessPension, lessOtherDebtLike,
    plusCash: cashSti,
    plusInvestments,
    equityValue: ev - debtBook + lessMinority + lessPreferred + lessPension + lessOtherDebtLike + cashSti + plusInvestments,
  };
}

// ---------------------------------------------------------------------------
// DCF
// ---------------------------------------------------------------------------

/** Solves the perpetual growth rate implied by an exit-multiple terminal value (reinvestment-consistent). */
function impliedGrowth(tvExit: number, ebitN: number, taxRate: number, wacc: number, spread: number): number {
  let lo = -0.05;
  let hi = wacc - 1e-4;
  const tv = (g: number) => terminalYear(ebitN, g, taxRate, wacc, spread).fcff / (wacc - g);
  if (!(tvExit > 0) || tv(hi) < tvExit) return hi;
  if (tv(lo) > tvExit) return lo;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (tv(mid) < tvExit) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function buildDcf(rows: Row[], n: number, years: number, labels: string[], A: Assumptions, wacc: number, baseFiscalYear: number): DcfResult {
  const L = n - 1;
  const projIdx = Array.from({ length: years }, (_, i) => n + i);
  const midYear = A.values.mid_year as number;
  const sbcAddback = A.values.sbc_addback as number;

  const projected: ProjectionYear[] = [];
  const fcffArr: number[] = [];
  const discPeriods: number[] = [];
  let yearIndex = 0;
  for (const p of projIdx) {
    const r = rows[p];
    yearIndex += 1;
    const fcff = r.nopat + r.da + r.capex + r.change_wc + r.other_operating + r.cf_sbc * sbcAddback;
    fcffArr.push(fcff);
    discPeriods.push(yearIndex - 0.5 * midYear);
    projected.push({
      fiscalYear: baseFiscalYear + (p - L), label: labels[p],
      revenue: r.revenue, grossProfit: r.gross_profit, ebit: r.ebit, ebitda: r.ebitda,
      nopat: r.nopat, da: r.da, capex: r.capex, changeWc: r.change_wc, sbc: r.cf_sbc, fcff,
      netIncome: r.net_income, eps: r.eps,
    });
  }

  const pvFcff = fcffArr.map((fcff, i) => fcff / (1 + wacc) ** discPeriods[i]);
  const sumPv = pvFcff.reduce((s, v) => s + v, 0);

  const lastProj = rows[projIdx[projIdx.length - 1]];
  const ebitdaTerminal = lastProj.ebitda;
  const g = A.values.terminal_growth as number;
  const mult = A.values.exit_multiple as number;
  const tT = A.values.terminal_tax_rate as number;
  const spread = A.values.terminal_roic_spread as number;

  const terminal = terminalYear(lastProj.ebit, g, tT, wacc, spread);
  // Gordon growth is undefined when WACC <= g; report 0 (flagged by the integrity checks) instead of a negative TV.
  const tvGordon = wacc > g ? terminal.fcff / (wacc - g) : 0;
  const tvExit = ebitdaTerminal * mult;
  const tvDiscPeriodGordon = discPeriods[discPeriods.length - 1];
  const tvDiscPeriodExit = yearIndex;
  const pvTvGordon = tvGordon / (1 + wacc) ** tvDiscPeriodGordon;
  const pvTvExit = tvExit / (1 + wacc) ** tvDiscPeriodExit;
  const tvMethod = A.values.tv_method as number;
  const pvTv = tvMethod === 1 ? pvTvGordon : pvTvExit;

  const enterpriseValue = sumPv + pvTv;
  const bridge = equityBridge(A, enterpriseValue, rows[L].total_debt, rows[L].cash_sti);
  const { price: impliedPrice, dilution } = priceFromEquity(A, bridge.equityValue);
  const currentPrice = A.values.price as number;
  const upside = impliedPrice / currentPrice - 1;

  return {
    years: projected,
    discountPeriods: discPeriods,
    pvFcff,
    sumPv,
    fcffTerminal: terminal.fcff,
    ebitdaTerminal,
    tvGordon,
    tvExit,
    pvTvGordon,
    pvTvExit,
    pvTv,
    enterpriseValue,
    lessDebt: bridge.lessDebt,
    plusCash: bridge.plusCash,
    equityValue: bridge.equityValue,
    impliedPrice,
    currentPrice,
    upside,
    tvShareOfEv: iferror(() => pvTv / enterpriseValue),
    // the Gordon TV sits at the mid-year point when mid-year discounting is on; restate to year-end before comparing to a multiple
    impliedExitMultiple: iferror(() => (tvGordon * (1 + wacc) ** (0.5 * midYear)) / ebitdaTerminal),
    impliedGrowthFromExit: impliedGrowth(tvExit, lastProj.ebit, tT, wacc, spread),
    bridge,
    terminal,
    dilution,
  };
}

function buildSensitivity(
  fcffArr: number[], discPeriods: number[], lastEbit: number, ebitdaTerminal: number, wacc: number,
  A: Assumptions, bridgeFixed: number, baseGrowth: number, baseMultiple: number,
): { gordon: SensitivityTable; exit: SensitivityTable } {
  const waccSteps = [-0.01, -0.005, 0, 0.005, 0.01];
  const multSteps = [-2, -1, 0, 1, 2];
  const growthSteps = [-0.01, -0.005, 0, 0.005, 0.01];
  const waccCols = waccSteps.map((s) => wacc + s);
  const tvDiscPeriodGordon = discPeriods[discPeriods.length - 1];
  const tvDiscPeriodExit = discPeriods.length;
  const tT = A.values.terminal_tax_rate as number;
  const spread = A.values.terminal_roic_spread as number;

  const pvExplicit = (w: number) => fcffArr.reduce((s, f, i) => s + f / (1 + w) ** discPeriods[i], 0);
  const toPrice = (ev: number) => priceFromEquity(A, ev + bridgeFixed).price;

  function priceGordon(w: number, g: number): number | null {
    if (w - g <= 0) return null;
    const tv = terminalYear(lastEbit, g, tT, w, spread).fcff / (w - g) / (1 + w) ** tvDiscPeriodGordon;
    return toPrice(pvExplicit(w) + tv);
  }
  function priceExit(w: number, m: number): number | null {
    if (w <= -1) return null;
    return toPrice(pvExplicit(w) + (ebitdaTerminal * m) / (1 + w) ** tvDiscPeriodExit);
  }

  return {
    gordon: {
      title: "Gordon growth method: terminal growth vs WACC",
      waccSteps: waccCols,
      rowLabel: "Terminal growth",
      rowValues: growthSteps.map((s) => baseGrowth + s),
      grid: growthSteps.map((gs) => waccCols.map((w) => priceGordon(w, baseGrowth + gs))),
    },
    exit: {
      title: "Exit multiple method: EV / EBITDA multiple vs WACC",
      waccSteps: waccCols,
      rowLabel: "Exit multiple",
      rowValues: multSteps.map((s) => baseMultiple + s),
      grid: multSteps.map((ms) => waccCols.map((w) => priceExit(w, baseMultiple + ms))),
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
  const investedCapital = (p: number) => get("total_debt", p) + get("total_equity", p) - get("cash_sti", p);
  const netReinvest = (p: number) => -get("capex", p) - get("da", p) - get("change_wc", p) - get("other_operating", p);

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
      const ic = investedCapital(p);
      return Math.abs(ic) < 0.01 ? 0 : (get("ebit", p) * (1 - taxRate)) / ic;
    }, "pct", "r_roic", "Return on invested capital", "Profitability"),
    at((p) => (p >= n && get("nopat", p) > 0 ? netReinvest(p) / get("nopat", p) : null), "pct", "r_reinv", "Reinvestment rate (net capex + ΔNWC) / NOPAT", "Value drivers"),
    // only meaningful when there is real net reinvestment (> 2% of NOPAT); otherwise growth is "free" and the ratio is undefined
    at((p) => (p > n && get("nopat", p - 1) > 0 && netReinvest(p - 1) > 0.02 * get("nopat", p - 1) ? (get("nopat", p) - get("nopat", p - 1)) / netReinvest(p - 1) : null), "pct", "r_iroic", "Incremental ROIC (ΔNOPAT / prior net reinvestment)", "Value drivers"),
    at((p) => get("fcf", p) / get("revenue", p), "pct", "r_fcf_margin", "FCF margin", "Cash flow"),
    at((p) => -get("capex", p) / get("revenue", p), "pct", "r_capex_rev", "Capex % of revenue", "Cash flow"),
    at((p) => get("total_current_assets", p) / get("total_current_liabilities", p), "mult", "r_current", "Current ratio", "Liquidity and leverage"),
    at((p) => get("total_debt", p) / get("total_equity", p), "mult", "r_de", "Debt / equity", "Liquidity and leverage"),
    at((p) => get("net_debt", p) / get("ebitda", p), "mult", "r_nd_ebitda", "Net debt / EBITDA", "Liquidity and leverage"),
    at((p) => get("ebit", p) / get("interest_expense", p), "mult", "r_int_cov", "Interest coverage", "Liquidity and leverage"),
    at((p) => (get("receivables", p) / get("revenue", p)) * 365, "days", "r_dso", "Days sales outstanding", "Working capital"),
    at((p) => (get("inventory", p) / get("cogs", p)) * 365, "days", "r_dio", "Days inventory outstanding", "Working capital"),
    at((p) => (get("payables", p) / get("cogs", p)) * 365, "days", "r_dpo", "Days payables outstanding", "Working capital"),
    at((p) => get("eps", p), "price", "r_eps", "Diluted EPS", "Per share"),
    at((p) => get("total_equity", p) / get("diluted_shares", p), "price", "r_bvps", "Book value per share", "Per share"),
    at((p) => get("fcf", p) / get("diluted_shares", p), "price", "r_fcfps", "FCF per share", "Per share"),
  ];
}

// ---------------------------------------------------------------------------
// Top-level orchestration
// ---------------------------------------------------------------------------

type Check = ModelResult["checks"][number];

export function buildModel(dataset: FinancialDataset, baseAssumptions: Assumptions, shift?: ModelShift): ModelResult {
  const assumptions = applyShift(baseAssumptions, shift);
  const { rows, n, years, labels } = buildRows(dataset, assumptions);
  const L = n - 1;

  const { wacc, beta } = computeWacc(dataset, assumptions, shift?.wacc ?? 0);
  const isRi = (assumptions.values.model_type as number) === 2;

  const dcf = buildDcf(rows, n, years, labels, assumptions, wacc.wacc, dataset.periods[L].fiscalYear);
  const ri = isRi ? buildResidualIncome(dataset, assumptions, wacc, labels.slice(n)) : undefined;

  const projIdx = Array.from({ length: years }, (_, i) => n + i);
  const fcffArr = dcf.years.map((y) => y.fcff);
  const lastProj = rows[projIdx[projIdx.length - 1]];
  const bridgeFixed = dcf.bridge.equityValue - dcf.bridge.enterpriseValue;
  const sens = buildSensitivity(
    fcffArr, dcf.discountPeriods, lastProj.ebit, dcf.ebitdaTerminal, wacc.wacc, assumptions, bridgeFixed,
    assumptions.values.terminal_growth as number, assumptions.values.exit_multiple as number,
  );
  const ratios = buildRatios(rows, n, years, assumptions.values.tax_rate as number);

  // headline values: for financials the residual-income result replaces the FCFF DCF
  if (ri) {
    const { price, dilution } = priceFromEquity(assumptions, ri.equityValue);
    dcf.impliedPrice = price;
    dcf.upside = price / dcf.currentPrice - 1;
    dcf.enterpriseValue = ri.equityValue;
    dcf.equityValue = ri.equityValue;
    dcf.dilution = dilution;
  }

  const balanceCheck = Math.abs(rows[L].total_assets - rows[L].total_liabilities_equity);
  const lastProjBalanceCheck = Math.abs(lastProj.total_assets - lastProj.total_liabilities_equity);
  const latestPeriodDays =
    n >= 2 ? (new Date(dataset.periods[L].periodEnd).getTime() - new Date(dataset.periods[L - 1].periodEnd).getTime()) / 86_400_000 : 365;
  const netDebt = rows[L].total_debt - rows[L].cash_sti;
  const netDebtToEv = iferror(() => netDebt / dcf.enterpriseValue);
  const minCash = Math.min(...projIdx.map((i) => rows[i].cash_sti));
  const maxRevolver = Math.max(...projIdx.map((i) => rows[i].revolver));
  const capexToDa = iferror(() => -lastProj.capex / lastProj.da);
  const g = assumptions.values.terminal_growth as number;

  const checks: Check[] = [
    { label: "Balance sheet balances (historical)", value: balanceCheck.toFixed(2), pass: balanceCheck < 1, why: "Assets must equal liabilities + equity in every historical period." },
    { label: "Balance sheet balances (final projection year)", value: lastProjBalanceCheck.toFixed(2), pass: lastProjBalanceCheck < 1, why: "The projected balance sheet is built by construction and should balance to a rounding error." },
    { label: "WACC exceeds terminal growth", value: `${(wacc.wacc * 100).toFixed(2)}% vs ${(g * 100).toFixed(2)}%`, pass: wacc.wacc > g, why: "The Gordon growth formula is undefined/negative if WACC does not exceed the terminal growth rate." },
    { label: "Beta regression has enough observations", value: `${beta.nObs} months`, pass: beta.nObs >= 24, why: "Fewer than 24 monthly observations makes the beta regression unreliable (beta falls back to 1.0)." },
    { label: "Beta source is bottom-up (peer median)", value: beta.method === "peer" ? `${beta.nPeers} peers, unlevered ${beta.unleveredBeta.toFixed(2)}` : "own regression", pass: beta.method === "peer", why: "A single stock's regression beta is noisy (wide standard error). The median unlevered beta of comparable companies, relevered at the target capital structure, is the practitioner standard." },
    { label: "Discount rate currency matches cash-flow currency", value: `${dataset.market.riskFreeCurrency ?? "USD"} rate vs ${dataset.profile.currency} statements`, pass: (dataset.market.riskFreeCurrency ?? "USD") === dataset.profile.currency, why: "A USD risk-free rate applied to INR (or any non-USD) cash flows mixes currencies and understates the discount rate by the inflation differential." },
    { label: "Latest fiscal year is a full ~12-month period", value: `${Math.round(latestPeriodDays)} days`, pass: latestPeriodDays >= 300 && latestPeriodDays <= 400, why: "A stub or interim period reported as the latest fiscal year would understate revenue and margins and distort every projection built from it." },
  ];

  if (!isRi) {
    const tvShare = dcf.tvShareOfEv;
    const exitLo = 4, exitHi = 30;
    checks.push(
      { label: "Projected funding gap covered by revolver", value: maxRevolver > 0 ? `revolver peaks at ${maxRevolver.toFixed(0)}` : "none needed", pass: maxRevolver <= 0.02 * (lastProj.revenue || 1), why: "The automatic revolver draws when buybacks, dividends or debt repayment exceed free cash flow. A large draw means the capital-return assumptions are not self-funding." },
      { label: "Projected cash stays non-negative", value: `${minCash.toFixed(0)} min cash & ST investments`, pass: minCash >= -1e-6, why: "The revolver keeps cash at the minimum; negative cash would mean the funding logic failed." },
      { label: "Terminal-year capex covers D&A", value: `${capexToDa.toFixed(2)}x`, pass: capexToDa >= 0.95 || g <= 0, why: "A growing perpetuity needs reinvestment at least about equal to depreciation (5% tolerance); capex below D&A in the final forecast year overstates the run-rate cash flow (the terminal value itself is reinvestment-normalised)." },
      { label: "Terminal ROIC at least WACC", value: `${(dcf.terminal.roic * 100).toFixed(1)}% vs ${(wacc.wacc * 100).toFixed(1)}%`, pass: dcf.terminal.roic >= wacc.wacc - 1e-9, why: "Growth beyond the forecast creates value only if new investment earns more than the cost of capital. ROIC below WACC in perpetuity means growth destroys value." },
      { label: "Terminal value share of EV", value: `${(tvShare * 100).toFixed(0)}%`, pass: tvShare <= 0.75, why: "When more than ~75% of enterprise value sits in the terminal value, the valuation is dominated by perpetuity assumptions rather than the explicit forecast." },
      { label: "Implied exit multiple in a sane band", value: `${dcf.impliedExitMultiple.toFixed(1)}x EV/EBITDA`, pass: dcf.impliedExitMultiple >= exitLo && dcf.impliedExitMultiple <= exitHi, why: `The Gordon terminal value implies an EV/EBITDA of ${dcf.impliedExitMultiple.toFixed(1)}x; outside ${exitLo}-${exitHi}x suggests the terminal growth / ROIC assumptions are unrealistic.` },
      { label: "Equity value is positive", value: dcf.equityValue.toFixed(0), pass: dcf.equityValue > 0, why: "Enterprise value below net debt and other claims means the modelled equity is worthless; the per-share value is floored at zero. Typically an over-levered or loss-making company where the DCF is not a reliable guide." },
      { label: "Net debt vs. DCF enterprise value", value: `${(netDebtToEv * 100).toFixed(0)}% of EV`, pass: netDebtToEv < 0.6, why: "When net debt is a large share of (or exceeds) the modeled enterprise value, small changes in operating assumptions swing equity value — and the implied price — disproportionately. Treat the DCF output as low-confidence here." },
    );
    // forecast reinvestment consistency: incremental ROIC should not persistently exceed ~3x WACC
    const iroic = ratios.find((r) => r.key === "r_iroic")!.values.slice(n + 1).filter((v): v is number => v != null && Number.isFinite(v));
    if (iroic.length) {
      const avgI = iroic.reduce((s, v) => s + v, 0) / iroic.length;
      checks.push({ label: "Forecast growth is funded (incremental ROIC)", value: `${(avgI * 100).toFixed(0)}% avg vs ${(wacc.wacc * 100).toFixed(1)}% WACC`, pass: avgI <= Math.max(0.5, 3 * wacc.wacc), why: "Incremental ROIC (change in NOPAT / net reinvestment) far above WACC means the forecast grows faster than the capex and working capital assumptions can plausibly finance." });
    }
  } else if (ri) {
    checks.push(
      { label: "Cost of equity exceeds terminal growth", value: `${(wacc.costOfEquity * 100).toFixed(2)}% vs ${(g * 100).toFixed(2)}%`, pass: wacc.costOfEquity > g, why: "The residual-income terminal value requires cost of equity > growth." },
      { label: "Book equity is positive", value: ri.bookValue.toFixed(0), pass: ri.bookValue > 0, why: "Residual income is anchored on book value; non-positive equity makes the method unreliable." },
    );
  }

  const multiples = {
    currentEvEbitda: iferror(() => (wacc.marketCap + netDebt) / (dataset.ttm?.ebitda != null ? dataset.ttm.ebitda / M : rows[L].ebitda)) || null,
    currentPe: iferror(() => wacc.marketCap / (dataset.ttm?.net_income != null ? dataset.ttm.net_income / M : rows[L].net_income)) || null,
    currentPb: iferror(() => wacc.marketCap / rows[L].total_equity) || null,
    impliedEvEbitda: iferror(() => dcf.enterpriseValue / rows[L].ebitda) || null,
  };

  const model: ModelResult = {
    dataset, assumptions, beta, wacc, dcf,
    sensitivityGordon: sens.gordon, sensitivityExit: sens.exit, ratios, checks,
    method: isRi ? "residual_income" : "fcff",
    ri,
    quality: [],
    multiples,
  };
  model.quality = runDataQuality(dataset, rows, n);
  const ratio = dcf.impliedPrice / dcf.currentPrice;
  if (ratio < 0.35 || ratio > 2.5) {
    model.quality.push({
      severity: "info",
      label: "Model value is far from the market price",
      detail: `Implied value is ${ratio.toFixed(2)}x the current price. The derived defaults extrapolate trailing growth and margins, fading to terminal growth; they cannot see a step-change in outlook (new businesses, turnarounds, cyclical troughs). Read the reverse DCF to see what the market is pricing before treating the gap as mispricing.`,
    });
  }
  return model;
}
