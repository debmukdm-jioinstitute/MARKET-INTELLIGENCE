import type { FinancialRatioMetrics, WorkingCapitalMetrics } from "./types";
import type { Values } from "./xbrl";

const r2 = (n: number | null): number | null =>
  n === null || !Number.isFinite(n) ? null : Math.round(n * 100) / 100;

export function deriveWorkingCapital(
  periodKey: string,
  periodLabel: string,
  pl: Values,
  bs: Values | null,
  periodKind: "quarter" | "annual",
): WorkingCapitalMetrics {
  const mult = periodKind === "quarter" ? 90 : 365;
  const revenue = pl.RevenueFromOperations ?? pl.InterestEarned ?? pl.Income ?? null;

  // Cost of goods sold / direct manufacturing or procurement cost
  const cogs =
    (pl.CostOfMaterialsConsumed ?? 0) +
    (pl.PurchasesOfStockInTrade ?? 0) +
    (pl.ChangesInInventoriesOfFinishedGoodsWorkInProgressAndStockInTrade ?? 0) ||
    pl.OperatingExpenses ||
    (pl.Expenses ? Math.max(0, pl.Expenses - (pl.EmployeeBenefitExpense ?? 0) - (pl.DepreciationDepletionAndAmortisationExpense ?? 0)) : null);

  const tradeReceivables = bs?.TradeReceivablesCurrent ?? bs?.TradeReceivablesNoncurrent ?? null;
  const inventories = bs?.Inventories ?? null;
  const tradePayables = bs?.TradePayablesCurrent ?? bs?.TradePayablesNoncurrent ?? null;

  const currentAssets = bs?.CurrentAssets ?? null;
  const currentLiabilities = bs?.CurrentLiabilities ?? null;
  const workingCapital =
    currentAssets !== null && currentLiabilities !== null ? currentAssets - currentLiabilities : null;

  // Days Sales Outstanding (DSO) = (Trade Receivables / Revenue) * Days
  const dso =
    tradeReceivables !== null && revenue && revenue > 0
      ? (tradeReceivables / revenue) * mult
      : null;

  // Days Inventory Outstanding (DIO) = (Inventories / COGS) * Days
  const dioDiv = cogs && cogs > 0 ? cogs : revenue && revenue > 0 ? revenue : null;
  const dio = inventories !== null && dioDiv ? (inventories / dioDiv) * mult : null;

  // Days Payable Outstanding (DPO) = (Trade Payables / COGS or Expenses) * Days
  const dpoDiv = cogs && cogs > 0 ? cogs : pl.Expenses && pl.Expenses > 0 ? pl.Expenses : null;
  const dpo = tradePayables !== null && dpoDiv ? (tradePayables / dpoDiv) * mult : null;

  // Cash Conversion Cycle (CCC) = DSO + DIO - DPO
  const ccc = dso !== null && dio !== null && dpo !== null ? dso + dio - dpo : null;

  return {
    periodKey,
    periodLabel,
    revenue: r2(revenue),
    cogs: r2(cogs),
    tradeReceivables: r2(tradeReceivables),
    inventories: r2(inventories),
    tradePayables: r2(tradePayables),
    workingCapital: r2(workingCapital),
    dso: r2(dso),
    dio: r2(dio),
    dpo: r2(dpo),
    ccc: r2(ccc),
  };
}

export function deriveFinancialRatios(
  periodKey: string,
  periodLabel: string,
  pl: Values,
  bs: Values | null,
  cf: Values | null,
  periodKind: "quarter" | "annual",
): FinancialRatioMetrics {
  const revenue = pl.RevenueFromOperations ?? pl.InterestEarned ?? pl.Income ?? null;
  const netProfit = pl.ProfitLossForPeriod ?? pl.ProfitLossAfterTaxesMinorityInterestAndShareOfProfitLossOfAssociates ?? null;
  const financeCosts = pl.FinanceCosts ?? null;
  const pbt = pl.ProfitBeforeTax ?? pl.ProfitLossFromOrdinaryActivitiesBeforeTax ?? null;
  const ebit = pbt !== null && financeCosts !== null ? pbt + financeCosts : pbt;

  // Operating profit, EBITDA-style (PBDIT convention, as on Screener.in):
  // Revenue - operating expenses before interest AND depreciation.
  const exp = pl.Expenses ?? pl.OperatingExpenses ?? null;
  const dep = pl.DepreciationDepletionAndAmortisationExpense ?? 0;
  const opProfit =
    revenue !== null && exp !== null && financeCosts !== null
      ? revenue - (exp - dep - financeCosts)
      : pl.OperatingProfitBeforeProvisionAndContingencies ?? null;

  // OPM %
  const opmPct = opProfit !== null && revenue && revenue > 0 ? (opProfit / revenue) * 100 : null;

  // NPM %
  const npmPct = netProfit !== null && revenue && revenue > 0 ? (netProfit / revenue) * 100 : null;

  // Equity & Capital Employed
  const equity = bs?.Equity ?? (bs?.Capital && bs?.ReservesAndSurplus ? bs.Capital + bs.ReservesAndSurplus : null);
  const totalAssets = bs?.Assets ?? null;
  const currentLiabilities = bs?.CurrentLiabilities ?? null;
  const capitalEmployed =
    totalAssets !== null && currentLiabilities !== null ? totalAssets - currentLiabilities : equity;

  // Multiplier for annualizing quarterly return metrics
  const annualMult = periodKind === "quarter" ? 4 : 1;

  // ROE %
  const roePct = netProfit !== null && equity && equity > 0 ? ((netProfit * annualMult) / equity) * 100 : null;

  // ROCE %
  const rocePct =
    ebit !== null && capitalEmployed && capitalEmployed > 0
      ? ((ebit * annualMult) / capitalEmployed) * 100
      : null;

  // Leverage: Total Debt / Equity
  // L1: use ?? not || — a zero-debt company (0 + 0) is genuinely 0.00x, not null.
  // The old `||` made 0 falsy, killing both the value and the forensic
  // "virtually debt-free" flag.
  const hasSplitBorrowings = bs?.BorrowingsNoncurrent != null || bs?.BorrowingsCurrent != null;
  const totalDebt = hasSplitBorrowings
    ? (bs!.BorrowingsNoncurrent ?? 0) + (bs!.BorrowingsCurrent ?? 0)
    : (bs?.Borrowings ?? null);
  const debtToEquity =
    totalDebt !== null && equity && equity > 0 ? totalDebt / equity : totalDebt === 0 ? 0 : null;

  // Current Ratio: Current Assets / Current Liabilities
  const currentRatio =
    bs?.CurrentAssets && bs?.CurrentLiabilities && bs.CurrentLiabilities > 0
      ? bs.CurrentAssets / bs.CurrentLiabilities
      : null;

  // Interest Coverage: EBIT / Finance Costs
  const interestCoverage =
    ebit !== null && financeCosts && financeCosts > 0
      ? ebit / financeCosts
      : financeCosts === 0 || financeCosts === null
      ? null
      : null;

  // CFO to Net Profit (Quality of earnings)
  const cfo = cf?.CashFlowsFromUsedInOperatingActivities ?? null;
  const cfoToNetProfit =
    cfo !== null && netProfit && netProfit > 0 ? cfo / netProfit : null;

  return {
    periodKey,
    periodLabel,
    opmPct: r2(opmPct),
    npmPct: r2(npmPct),
    roePct: r2(roePct),
    rocePct: r2(rocePct),
    debtToEquity: r2(debtToEquity),
    currentRatio: r2(currentRatio),
    interestCoverage: r2(interestCoverage),
    cfoToNetProfit: r2(cfoToNetProfit),
  };
}

/** Formats "2026-06-30" as "Q1 FY27", "2026-03-31" as "FY26". */
export function formatPeriodLabel(start: string, end: string, kind: "quarter" | "annual"): { key: string; label: string } {
  const em = /^(\d{4})-(\d{2})-(\d{2})/.exec(end);
  if (!em) return { key: `${start}_${end}`, label: end };
  const y = Number(em[1]);
  const m = Number(em[2]);

  if (kind === "annual") {
    // 31 March 2026 is FY26
    const fy = m <= 3 ? y : y + 1;
    return { key: `FY${fy}`, label: `FY${String(fy).slice(-2)}` };
  }

  // Quarters in Indian Fiscal Year (Apr-Mar):
  // Q1: Apr-Jun (end 06-30) -> FY(y+1)
  // Q2: Jul-Sep (end 09-30) -> FY(y+1)
  // Q3: Oct-Dec (end 12-31) -> FY(y+1)
  // Q4: Jan-Mar (end 03-31) -> FY(y)
  let q = "Q1";
  let fy = y + 1;
  if (m === 6) {
    q = "Q1";
    fy = y + 1;
  } else if (m === 9) {
    q = "Q2";
    fy = y + 1;
  } else if (m === 12) {
    q = "Q3";
    fy = y + 1;
  } else if (m === 3) {
    q = "Q4";
    fy = y;
  } else {
    q = `M${m}`;
    fy = y;
  }

  return { key: `${fy}-${q}`, label: `${q} FY${String(fy).slice(-2)}` };
}
