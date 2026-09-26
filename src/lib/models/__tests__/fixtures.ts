import type { FinancialDataset, FiscalPeriod } from "@/lib/models/types";

const M = 1e6;

/** A synthetic, internally consistent industrial company (all figures in raw units; currency USD). */
export function period(fy: number, k: number, over: Record<string, number> = {}): FiscalPeriod {
  return {
    periodEnd: `${fy}-12-31`,
    fiscalYear: fy,
    fields: {
      revenue: 1000 * M * k, cogs: 600 * M * k, sga: 150 * M * k, rnd: 50 * M * k, operating_income: 200 * M * k,
      da: 40 * M * k, interest_expense: 10 * M, interest_income: 5 * M, pretax_income: 195 * M * k, tax: 45 * M * k,
      net_income: 150 * M * k, diluted_shares: 100 * M, basic_shares: 98 * M,
      cash: 100 * M, cash_and_sti: 120 * M, receivables: 120 * M * k, inventory: 80 * M * k, current_assets: 350 * M * k,
      ppe: 400 * M * k, goodwill_intangibles: 50 * M, total_assets: 900 * M * k, payables: 70 * M * k,
      short_term_debt: 20 * M, current_liabilities: 150 * M * k, long_term_debt: 150 * M, total_liabilities: 400 * M * k,
      stockholders_equity: 500 * M * k,
      sbc: 10 * M, change_wc: -5 * M, capex: -60 * M * k, cfo: 200 * M * k, cfi: -70 * M * k, cff: -60 * M * k,
      dividends: -30 * M, buybacks: -20 * M, stock_issued: 0, debt_issued: 0, debt_repaid: 0,
      ...over,
    },
  };
}

export function series(n: number, vol: number, drift = 0.01): number[] {
  return Array.from({ length: n }, (_, i) => 100 * Math.exp(drift * i + vol * Math.sin(i * 1.7)));
}

export function dataset(over: Partial<FinancialDataset> = {}): FinancialDataset {
  const periods = [1, 1.1, 1.21, 1.33, 1.46, 1.6].map((k, i) => period(2019 + i, k));
  const c = series(37, 0.05);
  return {
    profile: { symbol: "TEST", name: "Test Co", exchange: "X", currency: "USD", fiscalYearEndMonth: 12, sector: "Industrials", industry: "Machinery" },
    market: {
      price: 30, priceDate: "2024-12-31", sharesOutstanding: 100 * M, currency: "USD",
      fiftyTwoWeekHigh: 40, fiftyTwoWeekLow: 22, riskFreeRate: 0.04, riskFreeSource: "test", indexSymbol: "I", indexName: "I",
      listingCurrency: "USD", listingPrice: 30, fxRate: null, riskFreeCurrency: "USD", countryRiskPremium: 0,
    },
    periods,
    stockPrices: { symbol: "T", name: "T", dates: c.map((_, i) => `m${i}`), closes: c },
    indexPrices: { symbol: "I", name: "I", dates: c.map((_, i) => `m${i}`), closes: series(37, 0.03) },
    source: "test", retrievedAt: "2025-03-01T00:00:00Z", notes: [], ttm: null, peers: null,
    ...over,
  };
}
