/** Novice-friendly copy + source URLs for macro tape metrics. */
export const METRIC_COPY: Record<
  string,
  { novice: string; provider: string; url: string }
> = {
  yield_in_3m: {
    novice: "What the government pays to borrow for 3 months. When short rates rise, banks often tighten lending.",
    provider: "FRED / RBI",
    url: "https://fred.stlouisfed.org/",
  },
  yield_in_10y: {
    novice: "Benchmark long-term borrowing cost for India. Higher yields can pressure stock valuations and raise home-loan rates.",
    provider: "FRED / NSE G-Sec",
    url: "https://www.nseindia.com/market-data/bonds-traded-in-capital-market",
  },
  yield_us_2y: {
    novice: "US short policy-sensitive yield. Often moves before the Fed and pulls global money flows.",
    provider: "FRED (DGS2)",
    url: "https://fred.stlouisfed.org/series/DGS2",
  },
  yield_us_10y: {
    novice: "Global ‘risk-free’ long rate. Rising US 10Y can pull foreign capital away from emerging markets like India.",
    provider: "FRED (DGS10)",
    url: "https://fred.stlouisfed.org/series/DGS10",
  },
  brent: {
    novice: "India imports most of its oil. Higher Brent raises inflation and hurts airlines, paints, and OMC margins unless fully passed through.",
    provider: "Yahoo Finance (BZ=F)",
    url: "https://finance.yahoo.com/quote/BZ=F",
  },
  gold: {
    novice: "Safe-haven metal. Often rises when the Rupee weakens or global uncertainty increases.",
    provider: "Yahoo Finance (GC=F)",
    url: "https://finance.yahoo.com/quote/GC=F",
  },
  silver: {
    novice: "Industrial + precious metal; moves with gold but often more volatile.",
    provider: "Yahoo Finance (SI=F)",
    url: "https://finance.yahoo.com/quote/SI=F",
  },
  copper: {
    novice: "Proxy for global industrial demand. Useful for metals and capital-goods sentiment in India.",
    provider: "Yahoo Finance (HG=F)",
    url: "https://finance.yahoo.com/quote/HG=F",
  },
  usd_inr: {
    novice: "How many Rupees per US Dollar. A weaker Rupee (higher number) helps IT exporters but raises import costs.",
    provider: "Yahoo Finance (INR=X)",
    url: "https://finance.yahoo.com/quote/INR=X",
  },
  dxy: {
    novice: "Broad US Dollar strength index. A stronger dollar often pressures emerging-market equities and currencies.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/DX-Y.NYB",
  },
  eur_inr: {
    novice: "Euro vs Rupee — matters for European export contracts and travel.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/EURINR=X",
  },
  gbp_inr: {
    novice: "Pound vs Rupee — relevant for UK education, travel, and pharma exports.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/GBPINR=X",
  },
  jpy_inr: {
    novice: "Yen vs Rupee — Japan is a key auto and electronics trade partner.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/JPYINR=X",
  },
  ticker_stream: {
    novice:
      "Continuous scroll of India indices, volatility, global benchmarks, FX, and commodities. Hover to pause; click symbols with links for detail pages.",
    provider: "Yahoo Finance + NSE pulse (Upstox/Yahoo)",
    url: "https://getmarketintelligence.vercel.app/macro",
  },
  ticker_nifty: {
    novice: "NIFTY 50 tracks the largest 50 companies on NSE — the main benchmark for Indian equities.",
    provider: "NSE / Yahoo Finance",
    url: "https://finance.yahoo.com/quote/%5ENSEI",
  },
  ticker_vix_in: {
    novice: "India VIX measures expected NIFTY volatility. Higher VIX often means more fear or hedging demand.",
    provider: "NSE India VIX",
    url: "https://www.nseindia.com/products-services/indices-indiavix",
  },
  ticker_vix: {
    novice: "US VIX is the ‘fear gauge’ for S&P 500 options. Spikes can hit global risk appetite including India.",
    provider: "CBOE / Yahoo Finance",
    url: "https://finance.yahoo.com/quote/%5EVIX",
  },
};
