/**
 * Pinned BSE SENSEX 30 constituent snapshot.
 *
 * Source: Wikipedia "List of BSE SENSEX companies" (checked 2026-10-07;
 * entry dates confirm Trent and Bharat Electronics added 23 Jun 2025 and
 * IndiGo added 22 Dec 2025), cross-checked against the Angel One live
 * SENSEX page on 07 Oct 2026 and ETV on 06 Oct 2026.
 *
 * BSE rebalances SENSEX semi-annually (June / December) — refresh this
 * snapshot after each rebalance. BSE publishes no free constituent CSV,
 * so the snapshot is the only free source.
 *
 * Symbols are NSE-style tickers (Yahoo maps them as <SYMBOL>.NS).
 * ISINs are intentionally null: the snapshot source carries no ISINs and
 * they must not be guessed.
 */

export type SensexConstituent = {
  symbol: string;
  name: string;
  industry: string;
  /** Always null — no free ISIN source for the pinned snapshot. */
  isin: null;
};

/** Date (YYYY-MM-DD) the pinned snapshot was last verified. */
export const SENSEX_SNAPSHOT_DATE = "2026-10-07";

export const SENSEX_CONSTITUENTS: readonly SensexConstituent[] = [
  { symbol: "ADANIPORTS", name: "Adani Ports & SEZ", industry: "Ports", isin: null },
  { symbol: "ASIANPAINT", name: "Asian Paints", industry: "Consumer Durables", isin: null },
  { symbol: "AXISBANK", name: "Axis Bank", industry: "Banks", isin: null },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", industry: "Finance", isin: null },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv", industry: "Finance", isin: null },
  { symbol: "BEL", name: "Bharat Electronics", industry: "Aerospace & Defence", isin: null },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", industry: "Telecommunication", isin: null },
  { symbol: "ETERNAL", name: "Eternal", industry: "Retailing", isin: null },
  { symbol: "HCLTECH", name: "HCLTech", industry: "IT", isin: null },
  { symbol: "HDFCBANK", name: "HDFC Bank", industry: "Banks", isin: null },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", industry: "FMCG", isin: null },
  { symbol: "ICICIBANK", name: "ICICI Bank", industry: "Banks", isin: null },
  { symbol: "INDIGO", name: "IndiGo", industry: "Airlines", isin: null },
  { symbol: "INFY", name: "Infosys", industry: "IT", isin: null },
  { symbol: "ITC", name: "ITC", industry: "FMCG", isin: null },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", industry: "Banks", isin: null },
  { symbol: "LT", name: "Larsen & Toubro", industry: "Construction", isin: null },
  { symbol: "M&M", name: "Mahindra & Mahindra", industry: "Automobiles", isin: null },
  { symbol: "MARUTI", name: "Maruti Suzuki", industry: "Automobiles", isin: null },
  { symbol: "NTPC", name: "NTPC", industry: "Power", isin: null },
  { symbol: "POWERGRID", name: "Power Grid", industry: "Power", isin: null },
  { symbol: "RELIANCE", name: "Reliance Industries", industry: "Petroleum", isin: null },
  { symbol: "SBIN", name: "State Bank of India", industry: "Banks", isin: null },
  { symbol: "SUNPHARMA", name: "Sun Pharma", industry: "Pharmaceuticals", isin: null },
  { symbol: "TCS", name: "TCS", industry: "IT", isin: null },
  { symbol: "TATASTEEL", name: "Tata Steel", industry: "Metals", isin: null },
  { symbol: "TECHM", name: "Tech Mahindra", industry: "IT", isin: null },
  { symbol: "TITAN", name: "Titan Company", industry: "Consumer Durables", isin: null },
  { symbol: "TRENT", name: "Trent", industry: "Retailing", isin: null },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement", industry: "Cement", isin: null },
];
