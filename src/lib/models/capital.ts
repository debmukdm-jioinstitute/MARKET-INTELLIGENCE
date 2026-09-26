/** Capital-structure helpers. */

/**
 * Market value of debt (Damodaran's approach): treat all debt as one bond with
 * coupon = interest expense, maturity `years`, discounted at the pre-tax cost of
 * debt. Falls back to book value when inputs are unusable.
 */
export function marketValueOfDebt(bookDebt: number, interestExpense: number, costOfDebt: number, years: number): number {
  if (!(bookDebt > 0) || !(costOfDebt > 0) || !(years > 0) || !(interestExpense >= 0)) return Math.max(0, bookDebt);
  const annuity = (1 - (1 + costOfDebt) ** -years) / costOfDebt;
  const mv = interestExpense * annuity + bookDebt / (1 + costOfDebt) ** years;
  // guard against pathological inputs (e.g. interest wildly out of line with debt)
  return Number.isFinite(mv) && mv > 0.3 * bookDebt && mv < 3 * bookDebt ? mv : bookDebt;
}
