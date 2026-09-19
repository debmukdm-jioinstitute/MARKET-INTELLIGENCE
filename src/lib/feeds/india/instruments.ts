/**
 * Curated India-equity instrument map — a small Nifty50 subset, not the full
 * ~1900-symbol NSE universe. Instrument keys resolved once from Upstox's
 * instrument master (https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz)
 * — they're stable (ISIN-based), not derived at request time.
 *
 * This is separate from the portfolio's `UNIVERSE` (src/lib/universe.ts,
 * all US/global names) — it backs the India Markets page and India option
 * chain (individual-stock underlyings), not the portfolio simulation.
 */

export type IndiaInstrument = {
  symbol: string;
  name: string;
  instrumentKey: string;
  isin: string;
  sector: string;
};

export const INDIA_EQUITIES: IndiaInstrument[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", instrumentKey: "NSE_EQ|INE002A01018", isin: "INE002A01018", sector: "Energy" },
  { symbol: "TCS", name: "Tata Consultancy Services", instrumentKey: "NSE_EQ|INE467B01029", isin: "INE467B01029", sector: "IT" },
  { symbol: "HDFCBANK", name: "HDFC Bank", instrumentKey: "NSE_EQ|INE040A01034", isin: "INE040A01034", sector: "Banking" },
  { symbol: "INFY", name: "Infosys", instrumentKey: "NSE_EQ|INE009A01021", isin: "INE009A01021", sector: "IT" },
  { symbol: "ICICIBANK", name: "ICICI Bank", instrumentKey: "NSE_EQ|INE090A01021", isin: "INE090A01021", sector: "Banking" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", instrumentKey: "NSE_EQ|INE030A01027", isin: "INE030A01027", sector: "FMCG" },
  { symbol: "ITC", name: "ITC", instrumentKey: "NSE_EQ|INE154A01025", isin: "INE154A01025", sector: "FMCG" },
  { symbol: "SBIN", name: "State Bank of India", instrumentKey: "NSE_EQ|INE062A01020", isin: "INE062A01020", sector: "Banking" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", instrumentKey: "NSE_EQ|INE397D01024", isin: "INE397D01024", sector: "Telecom" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", instrumentKey: "NSE_EQ|INE237A01036", isin: "INE237A01036", sector: "Banking" },
  { symbol: "LT", name: "Larsen & Toubro", instrumentKey: "NSE_EQ|INE018A01030", isin: "INE018A01030", sector: "Infrastructure" },
  { symbol: "AXISBANK", name: "Axis Bank", instrumentKey: "NSE_EQ|INE238A01034", isin: "INE238A01034", sector: "Banking" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", instrumentKey: "NSE_EQ|INE296A01032", isin: "INE296A01032", sector: "Financial Services" },
  { symbol: "ASIANPAINT", name: "Asian Paints", instrumentKey: "NSE_EQ|INE021A01026", isin: "INE021A01026", sector: "Consumer" },
  { symbol: "MARUTI", name: "Maruti Suzuki India", instrumentKey: "NSE_EQ|INE585B01010", isin: "INE585B01010", sector: "Auto" },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", instrumentKey: "NSE_EQ|INE044A01036", isin: "INE044A01036", sector: "Pharma" },
  { symbol: "TITAN", name: "Titan Company", instrumentKey: "NSE_EQ|INE280A01028", isin: "INE280A01028", sector: "Consumer" },
  { symbol: "WIPRO", name: "Wipro", instrumentKey: "NSE_EQ|INE075A01022", isin: "INE075A01022", sector: "IT" },
];

export const INDIA_INDEX_INSTRUMENT_KEYS = {
  NIFTY: "NSE_INDEX|Nifty 50",
  BANKNIFTY: "NSE_INDEX|Nifty Bank",
  FINNIFTY: "NSE_INDEX|Nifty Fin Service",
} as const;

export function findIndiaInstrument(symbol: string): IndiaInstrument | undefined {
  return INDIA_EQUITIES.find((i) => i.symbol.toUpperCase() === symbol.toUpperCase());
}
