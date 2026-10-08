/**
 * Deterministic financial math primitives for research analytics (Phase 1).
 *
 * Pure functions only, no I/O, no dependencies beyond types. Every helper
 * returns `null` for missing or invalid inputs — never 0, never Infinity.
 *
 * Conventions mirror `src/lib/financials/ratios.ts`:
 * - margin helpers return PERCENT (x100), null unless revenue > 0
 * - roe = PAT / avgEquity * 100, guarded by avgEquity > 0
 * - roce = EBIT / avgCapitalEmployed * 100, guarded by avgCE > 0
 * - interest coverage = EBIT / interest expense, guarded by interest > 0
 * - CFO/PAT, guarded by PAT > 0
 */

// Provided by the types workstream (`src/lib/research/analytics-types.ts`);
// type-only import is erased at build/test time.

type Numeric = number | null | undefined;

const isFiniteNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/**
 * Null unless both operands are finite and the denominator is non-zero.
 * Never 0-fills, never returns Infinity.
 */
export function safeDiv(num: Numeric, den: Numeric): number | null {
  if (!isFiniteNum(num) || !isFiniteNum(den) || den === 0) return null;
  return num / den;
}

/**
 * Compound annual growth rate as a fraction (0.1 = 10%).
 * Null when fewer than 2 finite values exist, the first value <= 0
 * (CAGR is not meaningful), or the result is non-finite.
 */
export function cagr(values: readonly Numeric[]): number | null {
  const finite = values.filter(isFiniteNum);
  if (finite.length < 2) return null;
  const first = finite[0];
  const last = finite[finite.length - 1];
  if (first <= 0) return null;
  const result = Math.pow(last / first, 1 / (finite.length - 1)) - 1;
  return Number.isFinite(result) ? result : null;
}

/**
 * Year-over-year growth as a fraction: (cur - prev) / |prev|.
 * Null when prev is 0, null, or non-finite.
 */
export function yoy(cur: Numeric, prev: Numeric): number | null {
  if (!isFiniteNum(cur) || !isFiniteNum(prev) || prev === 0) return null;
  return (cur - prev) / Math.abs(prev);
}

/** Shared margin builder: percent (x100), null unless revenue > 0. */
function marginPct(x: Numeric, revenue: Numeric): number | null {
  if (!isFiniteNum(x) || !isFiniteNum(revenue) || revenue <= 0) return null;
  return (x / revenue) * 100;
}

/** Gross margin %, null unless revenue > 0. */
export function grossMargin(grossProfit: Numeric, revenue: Numeric): number | null {
  return marginPct(grossProfit, revenue);
}

/** EBITDA margin %, null unless revenue > 0. */
export function ebitdaMargin(ebitda: Numeric, revenue: Numeric): number | null {
  return marginPct(ebitda, revenue);
}

/** EBIT margin %, null unless revenue > 0. */
export function ebitMargin(ebit: Numeric, revenue: Numeric): number | null {
  return marginPct(ebit, revenue);
}

/** PAT margin %, null unless revenue > 0. */
export function patMargin(pat: Numeric, revenue: Numeric): number | null {
  return marginPct(pat, revenue);
}

/** Free-cash-flow margin %, null unless revenue > 0. */
export function fcfMargin(fcfValue: Numeric, revenue: Numeric): number | null {
  return marginPct(fcfValue, revenue);
}

/** Mean of finite totalEquity across periods; null when none. */
export function avgEquity(periods: readonly { totalEquity: Numeric }[]): number | null {
  const values = periods.map((p) => p.totalEquity).filter(isFiniteNum);
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/**
 * Mean of finite (totalEquity + totalDebt) across periods; null when none.
 * A period contributes only when both fields are finite.
 */
export function avgCapitalEmployed(
  periods: readonly { totalEquity: Numeric; totalDebt: Numeric }[],
): number | null {
  const values = periods
    .map((p) =>
      isFiniteNum(p.totalEquity) && isFiniteNum(p.totalDebt) ? p.totalEquity + p.totalDebt : null,
    )
    .filter(isFiniteNum);
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/** ROE % = PAT / average equity * 100; null unless avgEq > 0 (ratios.ts guard). */
export function roe(pat: Numeric, avgEq: Numeric): number | null {
  if (!isFiniteNum(pat) || !isFiniteNum(avgEq) || avgEq <= 0) return null;
  return (pat / avgEq) * 100;
}

/** ROCE % = EBIT / average capital employed * 100; null unless avgCE > 0 (ratios.ts guard). */
export function roce(ebit: Numeric, avgCE: Numeric): number | null {
  if (!isFiniteNum(ebit) || !isFiniteNum(avgCE) || avgCE <= 0) return null;
  return (ebit / avgCE) * 100;
}

/**
 * Normalize provider-reported capex: cash-flow statements may report the
 * outflow as a negative number, so take the absolute value.
 * Null when missing.
 */
export function normalizeCapex(capex: Numeric): number | null {
  return isFiniteNum(capex) ? Math.abs(capex) : null;
}

/** FCF = CFO - capex outflow; null when either is missing. */
export function fcf(cfo: Numeric, capexOutflow: Numeric): number | null {
  if (!isFiniteNum(cfo) || !isFiniteNum(capexOutflow)) return null;
  return cfo - capexOutflow;
}

/** Days Sales Outstanding = receivables / revenue * 365; null unless revenue > 0. */
export function dso(receivables: Numeric, revenue: Numeric): number | null {
  if (!isFiniteNum(receivables) || !isFiniteNum(revenue) || revenue <= 0) return null;
  return (receivables / revenue) * 365;
}

/** Days Inventory Outstanding = inventory / COGS * 365; null unless COGS > 0. */
export function dio(inventory: Numeric, cogs: Numeric): number | null {
  if (!isFiniteNum(inventory) || !isFiniteNum(cogs) || cogs <= 0) return null;
  return (inventory / cogs) * 365;
}

/** Days Payable Outstanding = payables / COGS * 365; null unless COGS > 0. */
export function dpo(payables: Numeric, cogs: Numeric): number | null {
  if (!isFiniteNum(payables) || !isFiniteNum(cogs) || cogs <= 0) return null;
  return (payables / cogs) * 365;
}

/** Cash Conversion Cycle = DSO + DIO - DPO; null when any input is missing. */
export function ccc(dsoV: Numeric, dioV: Numeric, dpoV: Numeric): number | null {
  if (!isFiniteNum(dsoV) || !isFiniteNum(dioV) || !isFiniteNum(dpoV)) return null;
  return dsoV + dioV - dpoV;
}

/** Net debt = total debt - cash & equivalents; null when either is missing. */
export function netDebt(totalDebt: Numeric, cash: Numeric): number | null {
  if (!isFiniteNum(totalDebt) || !isFiniteNum(cash)) return null;
  return totalDebt - cash;
}

/** Net debt / EBITDA; null unless EBITDA is non-zero and finite. */
export function netDebtToEbitda(debt: Numeric, ebitda: Numeric): number | null {
  return safeDiv(debt, ebitda);
}

/** Debt / equity; null unless equity > 0 (ratios.ts guard). */
export function debtToEquity(totalDebt: Numeric, equity: Numeric): number | null {
  if (!isFiniteNum(equity) || equity <= 0) return null;
  return safeDiv(totalDebt, equity);
}

/** Interest coverage = EBIT / interest expense; null unless interest > 0 (ratios.ts guard). */
export function interestCoverage(ebit: Numeric, interest: Numeric): number | null {
  if (!isFiniteNum(interest) || interest <= 0) return null;
  return safeDiv(ebit, interest);
}

/** CFO / PAT (cash quality); null unless PAT > 0 (ratios.ts guard). */
export function cfoToPat(cfo: Numeric, pat: Numeric): number | null {
  if (!isFiniteNum(pat) || pat <= 0) return null;
  return safeDiv(cfo, pat);
}

/**
 * Percentile with linear interpolation over finite values, p in [0, 100].
 * p is clamped to [0, 100]. Null when there are no finite values.
 */
export function percentile(values: readonly Numeric[], p: number): number | null {
  const finite = values.filter(isFiniteNum);
  if (finite.length === 0) return null;
  const sorted = [...finite].sort((a, b) => a - b);
  const clamped = Math.min(100, Math.max(0, p));
  const rank = (clamped / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  return sorted[lo] + (rank - lo) * (sorted[hi] - sorted[lo]);
}

/** Median of finite values; null when empty. */
export function median(values: readonly Numeric[]): number | null {
  return percentile(values, 50);
}

/** { q1, median, q3 } over finite values; null fields when empty. */
export function quartiles(values: readonly Numeric[]): {
  q1: number | null;
  median: number | null;
  q3: number | null;
} {
  return {
    q1: percentile(values, 25),
    median: percentile(values, 50),
    q3: percentile(values, 75),
  };
}

/** Minimum of finite values; null when empty. */
export function minVal(values: readonly Numeric[]): number | null {
  const finite = values.filter(isFiniteNum);
  return finite.length > 0 ? Math.min(...finite) : null;
}

/** Maximum of finite values; null when empty. */
export function maxVal(values: readonly Numeric[]): number | null {
  const finite = values.filter(isFiniteNum);
  return finite.length > 0 ? Math.max(...finite) : null;
}

/** Mean of finite values; null when empty. */
export function mean(values: readonly Numeric[]): number | null {
  const finite = values.filter(isFiniteNum);
  return finite.length > 0 ? finite.reduce((a, b) => a + b, 0) / finite.length : null;
}
