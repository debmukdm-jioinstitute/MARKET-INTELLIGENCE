/**
 * Residual-income (excess-return) valuation for banks, insurers and NBFCs.
 *
 * FCFF-DCF is not meaningful for lenders: debt is raw material, capex/working
 * capital are undefined, and "free cash flow" depends on regulatory capital.
 * Instead: Equity value = Book value + PV of (ROE - cost of equity) x opening
 * book value, with ROE fading toward cost of equity + a long-run spread.
 */
import { iferror } from "@/lib/models/stats";
import type { Assumptions, FinancialDataset, ResidualIncomeResult, WaccResult } from "@/lib/models/types";

const M = 1e6;

export function buildResidualIncome(ds: FinancialDataset, A: Assumptions, wacc: WaccResult, labels: string[]): ResidualIncomeResult {
  const last = ds.periods[ds.periods.length - 1].fields;
  const bookValue =
    (Number(last.stockholders_equity) || Number(last.total_equity) || Number(last.total_assets) - Number(last.total_liabilities) || 0) / M;
  const ke = wacc.costOfEquity;
  const g = A.values.terminal_growth as number;
  const years = A.years;
  const roe0 = A.values.ri_roe as number;
  const payout = A.values.ri_payout as number;
  const roeT = ke + (A.values.ri_terminal_spread as number);

  const out: ResidualIncomeResult["years"] = [];
  let book = bookValue;
  let sumPv = 0;
  for (let t = 1; t <= years; t++) {
    const roe = roe0 + (roeT - roe0) * (t / years);
    const ni = roe * book;
    const charge = ke * book;
    const ri = ni - charge;
    const div = Math.max(0, ni) * payout;
    const close = book + ni - div;
    sumPv += ri / (1 + ke) ** t;
    out.push({ label: labels[t - 1] ?? `Y${t}`, bookOpen: book, roe, netIncome: ni, equityCharge: charge, residualIncome: ri, dividends: div, bookClose: close });
    book = close;
  }
  // terminal: excess return on year-N book equity persists and grows at g
  const terminalResidualIncome = (roeT - ke) * book;
  const tvRi = ke > g ? terminalResidualIncome / (ke - g) : 0;
  const pvTvRi = tvRi / (1 + ke) ** years;
  const equityValue = bookValue + sumPv + pvTvRi;

  return {
    years: out,
    costOfEquity: ke,
    terminalRoe: roeT,
    bookValue,
    sumPvRi: sumPv,
    terminalResidualIncome,
    tvRi,
    pvTvRi,
    equityValue,
    impliedPb: iferror(() => equityValue / bookValue),
  };
}
