import { NIFTY_500 } from "./nifty500";

/** CMIE accepts partial legal name, CIN, or CMIE code — NSE symbols alone often fail. */
export function resolveProwessCompany(input: string): string {
  const sym = input.trim().toUpperCase();
  const row = NIFTY_500.find(([s]) => s === sym);
  return row ? row[1] : input.trim();
}
