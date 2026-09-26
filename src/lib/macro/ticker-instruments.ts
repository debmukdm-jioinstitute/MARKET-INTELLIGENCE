export type TickerInstrument = {
  id: string;
  label: string;
  symbol: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  copyKey: string;
  href?: string;
  group: "india" | "global" | "fx" | "commodity" | "vol";
};

/** Ordered tape — India first, then global, FX, commodities. */
export const TICKER_INSTRUMENTS: TickerInstrument[] = [
  { id: "nifty", label: "NIFTY 50", symbol: "^NSEI", copyKey: "ticker_nifty", href: "/research/%5ENSEI", group: "india" },
  { id: "sensex", label: "SENSEX", symbol: "^BSESN", copyKey: "ticker_sensex", group: "india" },
  { id: "banknifty", label: "BANK NIFTY", symbol: "^NSEBANK", copyKey: "ticker_banknifty", group: "india" },
  { id: "vix_in", label: "INDIA VIX", symbol: "^INDIAVIX", decimals: 2, copyKey: "ticker_vix_in", group: "vol" },
  { id: "nifty_it", label: "NIFTY IT", symbol: "^CNXIT", copyKey: "ticker_nifty_it", href: "/research/%5ECNXIT", group: "india" },
  { id: "nifty_pharma", label: "NIFTY PHARMA", symbol: "^CNXPHARMA", copyKey: "ticker_nifty_pharma", group: "india" },
  { id: "nifty_auto", label: "NIFTY AUTO", symbol: "^CNXAUTO", copyKey: "ticker_nifty_auto", group: "india" },
  { id: "nifty_fmcg", label: "NIFTY FMCG", symbol: "^CNXFMCG", copyKey: "ticker_nifty_fmcg", group: "india" },
  { id: "nifty_metal", label: "NIFTY METAL", symbol: "^CNXMETAL", copyKey: "ticker_nifty_metal", group: "india" },
  { id: "nifty_energy", label: "NIFTY ENERGY", symbol: "^CNXENERGY", copyKey: "ticker_nifty_energy", group: "india" },
  { id: "midcap", label: "NIFTY MIDCAP", symbol: "NIFTY_MIDCAP_100.NS", copyKey: "ticker_midcap", group: "india" },
  { id: "smallcap", label: "NIFTY SMALLCAP", symbol: "^CNXSC", copyKey: "ticker_smallcap", group: "india" },
  { id: "spx", label: "S&P 500", symbol: "^GSPC", copyKey: "ticker_spx", group: "global" },
  { id: "nasdaq", label: "NASDAQ", symbol: "^IXIC", copyKey: "ticker_nasdaq", group: "global" },
  { id: "dow", label: "DOW", symbol: "^DJI", copyKey: "ticker_dow", group: "global" },
  { id: "nikkei", label: "NIKKEI", symbol: "^N225", copyKey: "ticker_nikkei", group: "global" },
  { id: "dax", label: "DAX", symbol: "^GDAXI", copyKey: "ticker_dax", group: "global" },
  { id: "ftse", label: "FTSE", symbol: "^FTSE", copyKey: "ticker_ftse", group: "global" },
  { id: "hangseng", label: "HANG SENG", symbol: "^HSI", copyKey: "ticker_hsi", group: "global" },
  { id: "us10y", label: "US 10Y", symbol: "^TNX", suffix: "%", decimals: 2, copyKey: "yield_us_10y", group: "global" },
  { id: "vix", label: "VIX", symbol: "^VIX", decimals: 2, copyKey: "ticker_vix", group: "vol" },
  { id: "dxy", label: "DXY", symbol: "DX-Y.NYB", decimals: 2, copyKey: "dxy", href: "/macro/currency#dxy", group: "fx" },
  { id: "usd_inr", label: "USD/INR", symbol: "INR=X", prefix: "₹", decimals: 2, copyKey: "usd_inr", href: "/macro/currency#usd_inr", group: "fx" },
  { id: "eur_inr", label: "EUR/INR", symbol: "EURINR=X", prefix: "₹", decimals: 2, copyKey: "eur_inr", href: "/macro/currency#eur_inr", group: "fx" },
  { id: "gbp_inr", label: "GBP/INR", symbol: "GBPINR=X", prefix: "₹", decimals: 2, copyKey: "gbp_inr", group: "fx" },
  { id: "jpy_inr", label: "JPY/INR", symbol: "JPYINR=X", prefix: "₹", decimals: 2, copyKey: "jpy_inr", group: "fx" },
  { id: "brent", label: "BRENT", symbol: "BZ=F", prefix: "$", decimals: 2, copyKey: "brent", href: "/macro/commodities#brent", group: "commodity" },
  { id: "wti", label: "WTI", symbol: "CL=F", prefix: "$", decimals: 2, copyKey: "wti", href: "/macro/commodities#wti", group: "commodity" },
  { id: "gold", label: "GOLD", symbol: "GC=F", prefix: "$", decimals: 0, copyKey: "gold", href: "/macro/commodities#gold", group: "commodity" },
  { id: "silver", label: "SILVER", symbol: "SI=F", prefix: "$", decimals: 2, copyKey: "silver", href: "/macro/commodities#silver", group: "commodity" },
  { id: "copper", label: "COPPER", symbol: "HG=F", prefix: "$", decimals: 2, copyKey: "copper", href: "/macro/commodities#copper", group: "commodity" },
  { id: "natgas", label: "NAT GAS", symbol: "NG=F", prefix: "$", decimals: 2, copyKey: "natgas", href: "/macro/commodities#natgas", group: "commodity" },
];
