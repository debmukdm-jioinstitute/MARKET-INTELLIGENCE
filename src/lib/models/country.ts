/**
 * Country / currency defaults for the cost of capital, plus a synthetic
 * credit-rating table (Damodaran-style: interest coverage -> default spread).
 *
 * The numbers below are static, approximate defaults (early-2026 vintage,
 * modelled on Prof. Aswath Damodaran's published country-risk and rating
 * datasets). They exist so the discount rate is denominated in the SAME
 * currency as the cash flows; every one is surfaced in the Assumptions panel
 * and should be refreshed / overridden for anything material.
 */

export const MATURE_ERP = 0.046;

export type CountryDefault = { currency: string; country: string; riskFree: number; crp: number; g: number };

/** Statement currency -> local 10Y risk-free (nominal, local currency) and country risk premium. */
export const COUNTRY_DEFAULTS: Record<string, CountryDefault> = {
  USD: { currency: "USD", country: "United States", riskFree: 0.042, crp: 0, g: 0.025 },
  INR: { currency: "INR", country: "India", riskFree: 0.066, crp: 0.029, g: 0.05 },
  EUR: { currency: "EUR", country: "Euro area", riskFree: 0.027, crp: 0, g: 0.02 },
  GBP: { currency: "GBP", country: "United Kingdom", riskFree: 0.045, crp: 0.0055, g: 0.0225 },
  JPY: { currency: "JPY", country: "Japan", riskFree: 0.016, crp: 0.0055, g: 0.01 },
  CNY: { currency: "CNY", country: "China", riskFree: 0.019, crp: 0.0075, g: 0.04 },
  HKD: { currency: "HKD", country: "Hong Kong", riskFree: 0.033, crp: 0.0075, g: 0.03 },
  CAD: { currency: "CAD", country: "Canada", riskFree: 0.033, crp: 0, g: 0.025 },
  AUD: { currency: "AUD", country: "Australia", riskFree: 0.043, crp: 0, g: 0.03 },
  CHF: { currency: "CHF", country: "Switzerland", riskFree: 0.004, crp: 0, g: 0.015 },
  KRW: { currency: "KRW", country: "South Korea", riskFree: 0.03, crp: 0.0075, g: 0.03 },
  TWD: { currency: "TWD", country: "Taiwan", riskFree: 0.015, crp: 0.0075, g: 0.025 },
  SGD: { currency: "SGD", country: "Singapore", riskFree: 0.026, crp: 0, g: 0.03 },
  SEK: { currency: "SEK", country: "Sweden", riskFree: 0.025, crp: 0, g: 0.02 },
  DKK: { currency: "DKK", country: "Denmark", riskFree: 0.026, crp: 0, g: 0.02 },
  NOK: { currency: "NOK", country: "Norway", riskFree: 0.038, crp: 0, g: 0.02 },
  BRL: { currency: "BRL", country: "Brazil", riskFree: 0.13, crp: 0.035, g: 0.05 },
  MXN: { currency: "MXN", country: "Mexico", riskFree: 0.093, crp: 0.028, g: 0.045 },
  ZAR: { currency: "ZAR", country: "South Africa", riskFree: 0.095, crp: 0.04, g: 0.045 },
};

/**
 * A government bond yield in local currency embeds the sovereign default spread, which the country risk
 * premium ALSO captures. Damodaran's fix: risk-free = government yield - default spread, with the
 * equity CRP = default spread x ~1.5 (equity / bond volatility). Using the raw yield plus a CRP double-counts.
 */
export const sovereignDefaultSpread = (crp: number) => crp / 1.5;

export function countryDefaults(currency: string): CountryDefault | null {
  return COUNTRY_DEFAULTS[currency] ?? null;
}

/** [minimum interest coverage, rating, default spread]; first row whose minimum the firm meets. */
export const RATING_TABLE: [number, string, number][] = [
  [8.5, "AAA", 0.0059],
  [6.5, "AA", 0.0079],
  [5.5, "A+", 0.0095],
  [4.25, "A", 0.0107],
  [3.0, "A-", 0.0123],
  [2.5, "BBB", 0.0163],
  [2.25, "BB+", 0.0245],
  [2.0, "BB", 0.0306],
  [1.75, "B+", 0.0446],
  [1.5, "B", 0.0521],
  [1.25, "B-", 0.0655],
  [0.8, "CCC", 0.0918],
  [0.65, "CC", 0.1214],
  [0.2, "C", 0.1571],
  [-Infinity, "D", 0.2],
];

export function syntheticRating(coverage: number): { rating: string; spread: number } {
  for (const [min, rating, spread] of RATING_TABLE) if (coverage >= min) return { rating, spread };
  return { rating: "D", spread: 0.2 };
}

/** Marginal statutory corporate tax rate used for the terminal year (approximate, by statement currency). */
export const MARGINAL_TAX: Record<string, number> = {
  USD: 0.25, INR: 0.2517, EUR: 0.25, GBP: 0.25, JPY: 0.3, CNY: 0.25, HKD: 0.165, CAD: 0.265,
  AUD: 0.3, CHF: 0.15, KRW: 0.24, TWD: 0.2, SGD: 0.17, SEK: 0.206, DKK: 0.22, NOK: 0.22,
  BRL: 0.34, MXN: 0.3, ZAR: 0.27,
};
export const marginalTaxRate = (currency: string) => MARGINAL_TAX[currency] ?? 0.25;
