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
  wti: {
    novice: "US benchmark crude. Often trades near Brent; spreads matter for global refining margins.",
    provider: "Yahoo Finance (CL=F)",
    url: "https://finance.yahoo.com/quote/CL=F",
  },
  natgas: {
    novice: "US natural gas benchmark. Feeds into LNG pricing and fertilizer (urea) cost curves over time.",
    provider: "Yahoo Finance (NG=F)",
    url: "https://finance.yahoo.com/quote/NG=F",
  },
  gasoline: {
    novice: "Wholesale US gasoline futures — early signal for transport inflation and OMC marketing margins.",
    provider: "Yahoo Finance (RB=F)",
    url: "https://finance.yahoo.com/quote/RB=F",
  },
  heating_oil: {
    novice: "Distillate benchmark; correlates with diesel economics and industrial fuel demand.",
    provider: "Yahoo Finance (HO=F)",
    url: "https://finance.yahoo.com/quote/HO=F",
  },
  platinum: {
    novice: "Industrial precious metal (auto catalysts). Complements gold for inflation and manufacturing cycles.",
    provider: "Yahoo Finance (PL=F)",
    url: "https://finance.yahoo.com/quote/PL=F",
  },
  palladium: {
    novice: "Auto-catalyst metal; volatile proxy for vehicle production and emissions-regulation demand.",
    provider: "Yahoo Finance (PA=F)",
    url: "https://finance.yahoo.com/quote/PA=F",
  },
  aluminum: {
    novice: "Light industrial metal — power costs and China supply drive Hindalco / NALCO sentiment.",
    provider: "Yahoo Finance (ALI=F)",
    url: "https://finance.yahoo.com/quote/ALI=F",
  },
  corn: {
    novice: "Global feed-grain benchmark. Matters for poultry, ethanol, and rural inflation spillovers.",
    provider: "Yahoo Finance (ZC=F)",
    url: "https://finance.yahoo.com/quote/ZC=F",
  },
  soybeans: {
    novice: "Protein and oilseed benchmark — edible oil and meal prices in India track global soy complex.",
    provider: "Yahoo Finance (ZS=F)",
    url: "https://finance.yahoo.com/quote/ZS=F",
  },
  wheat: {
    novice: "Staple grain futures. Global wheat spikes feed into domestic food inflation and import policy.",
    provider: "Yahoo Finance (ZW=F)",
    url: "https://finance.yahoo.com/quote/ZW=F",
  },
  sugar: {
    novice: "Soft commodity benchmark. Relevant for sugar mills, ethanol blending, and FMCG sweetener costs.",
    provider: "Yahoo Finance (SB=F)",
    url: "https://finance.yahoo.com/quote/SB=F",
  },
  coffee: {
    novice: "Arabica benchmark — affects café chains and packaged beverage input costs.",
    provider: "Yahoo Finance (KC=F)",
    url: "https://finance.yahoo.com/quote/KC=F",
  },
  cotton: {
    novice: "Textile raw material benchmark. Moves with monsoon, China demand, and apparel export orders.",
    provider: "Yahoo Finance (CT=F)",
    url: "https://finance.yahoo.com/quote/CT=F",
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
