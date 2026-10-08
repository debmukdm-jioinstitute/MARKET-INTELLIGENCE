import { NIFTY50_CORE_SYMBOLS } from "@/lib/my-portfolio/benchmark-constituents";
import { NIFTY_500 } from "@/lib/prowess/nifty500";

export type Nifty500CapTier = "LARGE_CAP" | "MID_CAP" | "SMALL_CAP";

const NIFTY500_SET = new Set(NIFTY_500.map(([s]) => s.toUpperCase()));

/** Nifty 50 + Sensex overlap — treated as large cap for retail sentiment filters. */
const LARGE_CAP_SYMBOLS = new Set([
  ...NIFTY50_CORE_SYMBOLS,
  "RELIANCE",
  "TCS",
  "HDFCBANK",
  "INFY",
  "ICICIBANK",
  "BHARTIARTL",
  "ITC",
  "SBIN",
  "LT",
  "KOTAKBANK",
  "AXISBANK",
  "HINDUNILVR",
  "BAJFINANCE",
  "MARUTI",
  "ASIANPAINT",
  "SUNPHARMA",
  "TITAN",
  "WIPRO",
  "TATAMOTORS",
  "TATASTEEL",
  "HCLTECH",
  "TECHM",
  "NTPC",
  "POWERGRID",
  "ONGC",
  "ADANIENT",
  "ADANIPORTS",
]);

/** Midcap 150 snapshot names from benchmark desk. */
const MID_CAP_SYMBOLS = new Set([
  "PERSISTENT",
  "COFORGE",
  "AUROPHARMA",
  "MPHASIS",
  "INDHOTEL",
  "GODREJCP",
  "DIXON",
  "TRENT",
  "POLYCAB",
  "MAXHEALTH",
  "VOLTAS",
  "CUMMINSIND",
  "PIIND",
  "MRF",
  "SUZLON",
  "ZOMATO",
  "PAYTM",
  "DELHIVERY",
  "POLICYBZR",
  "NYKAA",
]);

export function isNifty500Symbol(symbol: string): boolean {
  return NIFTY500_SET.has(symbol.toUpperCase().trim());
}

export function getNifty500CapTier(symbol: string): Nifty500CapTier {
  const s = symbol.toUpperCase().trim();
  if (LARGE_CAP_SYMBOLS.has(s)) return "LARGE_CAP";
  if (MID_CAP_SYMBOLS.has(s)) return "MID_CAP";
  return "SMALL_CAP";
}

export function capTierLabel(tier: Nifty500CapTier): string {
  switch (tier) {
    case "LARGE_CAP":
      return "Large cap";
    case "MID_CAP":
      return "Mid cap";
    case "SMALL_CAP":
      return "Small cap";
  }
}
