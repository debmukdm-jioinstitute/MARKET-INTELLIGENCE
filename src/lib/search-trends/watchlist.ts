import type { SearchTrendWatchItem } from "@/lib/search-trends/types";

/** Default Attention Index watchlist — India geo (`IN`) on Google Trends. */
export const SEARCH_TREND_WATCHLIST: SearchTrendWatchItem[] = [
  { id: "co-reliance", category: "company", label: "Reliance Industries", keyword: "Reliance Industries", symbol: "RELIANCE" },
  { id: "co-tcs", category: "company", label: "TCS", keyword: "Tata Consultancy Services", symbol: "TCS" },
  { id: "co-hdfc", category: "company", label: "HDFC Bank", keyword: "HDFC Bank", symbol: "HDFCBANK" },
  { id: "co-infy", category: "company", label: "Infosys", keyword: "Infosys", symbol: "INFY" },
  { id: "co-adani", category: "company", label: "Adani Group", keyword: "Adani Group", symbol: "ADANIENT" },

  { id: "ipo-main", category: "ipo", label: "Mainboard IPO India", keyword: "IPO India stock market" },
  { id: "ipo-sme", category: "ipo", label: "SME IPO", keyword: "SME IPO India" },
  { id: "ipo-sub", category: "ipo", label: "IPO subscription", keyword: "IPO subscription status India" },

  { id: "sec-bank", category: "sector", label: "Banking", keyword: "banking sector India stocks" },
  { id: "sec-it", category: "sector", label: "IT services", keyword: "IT sector India Nifty" },
  { id: "sec-pharma", category: "sector", label: "Pharma", keyword: "pharma stocks India" },
  { id: "sec-auto", category: "sector", label: "Auto", keyword: "auto sector India stocks" },

  { id: "com-gold", category: "commodity", label: "Gold", keyword: "gold price India" },
  { id: "com-crude", category: "commodity", label: "Crude oil", keyword: "crude oil price India" },
  { id: "com-silver", category: "commodity", label: "Silver", keyword: "silver price India" },
  { id: "com-copper", category: "commodity", label: "Copper", keyword: "copper price India" },

  { id: "eco-infl", category: "economic_indicator", label: "Inflation (CPI)", keyword: "India inflation CPI" },
  { id: "eco-gdp", category: "economic_indicator", label: "GDP growth", keyword: "India GDP growth" },
  { id: "eco-rbi", category: "economic_indicator", label: "RBI repo rate", keyword: "RBI repo rate" },
  { id: "eco-fii", category: "economic_indicator", label: "FII flows", keyword: "FII DII flow India" },

  { id: "pol-budget", category: "policy", label: "Union Budget", keyword: "Union Budget India" },
  { id: "pol-gst", category: "policy", label: "GST", keyword: "GST India" },
  { id: "pol-sebi", category: "policy", label: "SEBI", keyword: "SEBI regulations India" },

  { id: "ceo-ambani", category: "ceo", label: "Mukesh Ambani", keyword: "Mukesh Ambani" },
  { id: "ceo-adani", category: "ceo", label: "Gautam Adani", keyword: "Gautam Adani" },
  { id: "ceo-chandra", category: "ceo", label: "N Chandrasekaran", keyword: "N Chandrasekaran Tata" },

  { id: "prod-upi", category: "product", label: "UPI", keyword: "UPI payments India" },
  { id: "prod-ev", category: "product", label: "Electric vehicles", keyword: "electric vehicle India" },
  { id: "prod-jio", category: "product", label: "Jio", keyword: "Jio telecom India" },
];
