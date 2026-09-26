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
  ethanol: {
    novice: "US ethanol futures — biofuel blending and corn demand signal.",
    provider: "Yahoo Finance (ETH=F)",
    url: "https://finance.yahoo.com/quote/ETH=F",
  },
  uranium: {
    novice: "Uranium oxide benchmark — nuclear fuel cycle and energy-security sentiment.",
    provider: "Yahoo Finance (UX=F)",
    url: "https://finance.yahoo.com/quote/UX=F",
  },
  soy_oil: {
    novice: "Soybean oil futures — tracks edible-oil import pressure in India.",
    provider: "Yahoo Finance (ZL=F)",
    url: "https://finance.yahoo.com/quote/ZL=F",
  },
  soy_meal: {
    novice: "Protein meal benchmark for animal feed and crushing margins.",
    provider: "Yahoo Finance (ZM=F)",
    url: "https://finance.yahoo.com/quote/ZM=F",
  },
  kc_wheat: {
    novice: "Kansas City wheat — hard red winter benchmark for global bread-basket supply.",
    provider: "Yahoo Finance (KE=F)",
    url: "https://finance.yahoo.com/quote/KE=F",
  },
  rough_rice: {
    novice: "US rough rice futures — reference for Asian rice trade and food inflation.",
    provider: "Yahoo Finance (ZR=F)",
    url: "https://finance.yahoo.com/quote/ZR=F",
  },
  cocoa: {
    novice: "Cocoa futures — confectionery input costs and West Africa supply risk.",
    provider: "Yahoo Finance (CC=F)",
    url: "https://finance.yahoo.com/quote/CC=F",
  },
  us_oil_etf: {
    novice: "US listed oil ETF (USO) — liquid US benchmark for crude exposure.",
    provider: "Yahoo Finance (USO)",
    url: "https://finance.yahoo.com/quote/USO",
  },
  brent_etf: {
    novice: "Brent-linked US ETF (BNO) — closer to India’s import basket than WTI alone.",
    provider: "Yahoo Finance (BNO)",
    url: "https://finance.yahoo.com/quote/BNO",
  },
  natgas_etf: {
    novice: "US natural gas ETF (UNG) — LNG and fertilizer cost proxy.",
    provider: "Yahoo Finance (UNG)",
    url: "https://finance.yahoo.com/quote/UNG",
  },
  gold_etf: {
    novice: "SPDR Gold Shares (GLD) — deep US liquidity benchmark for bullion sentiment.",
    provider: "Yahoo Finance (GLD)",
    url: "https://finance.yahoo.com/quote/GLD",
  },
  silver_etf: {
    novice: "iShares Silver Trust (SLV) — US listed silver exposure.",
    provider: "Yahoo Finance (SLV)",
    url: "https://finance.yahoo.com/quote/SLV",
  },
  platinum_etf: {
    novice: "Aberdeen Physical Platinum (PPLT) — US ETP for platinum.",
    provider: "Yahoo Finance (PPLT)",
    url: "https://finance.yahoo.com/quote/PPLT",
  },
  palladium_etf: {
    novice: "Aberdeen Physical Palladium (PALL) — auto-catalyst metal exposure.",
    provider: "Yahoo Finance (PALL)",
    url: "https://finance.yahoo.com/quote/PALL",
  },
  copper_etf: {
    novice: "United States Copper Index Fund (CPER) — US listed copper beta.",
    provider: "Yahoo Finance (CPER)",
    url: "https://finance.yahoo.com/quote/CPER",
  },
  ag_etf: {
    novice: "Invesco DB Agriculture Fund (DBA) — diversified US ag commodity basket.",
    provider: "Yahoo Finance (DBA)",
    url: "https://finance.yahoo.com/quote/DBA",
  },
  corn_etf: {
    novice: "Teucrium Corn Fund (CORN) — US corn exposure without futures margin.",
    provider: "Yahoo Finance (CORN)",
    url: "https://finance.yahoo.com/quote/CORN",
  },
  wheat_etf: {
    novice: "Teucrium Wheat Fund (WEAT) — US wheat beta for food inflation hedges.",
    provider: "Yahoo Finance (WEAT)",
    url: "https://finance.yahoo.com/quote/WEAT",
  },
  soy_etf: {
    novice: "Teucrium Soybean Fund (SOYB) — US soy complex exposure.",
    provider: "Yahoo Finance (SOYB)",
    url: "https://finance.yahoo.com/quote/SOYB",
  },
  gasoline_etf: {
    novice: "US Gasoline Fund (UGA) — RBOB-linked ETF for transport fuel inflation.",
    provider: "Yahoo Finance (UGA)",
    url: "https://finance.yahoo.com/quote/UGA",
  },
  xop_etf: {
    novice: "SPDR Oil & Gas Exploration & Production ETF — US E&P equity beta to crude.",
    provider: "Yahoo Finance (XOP)",
    url: "https://finance.yahoo.com/quote/XOP",
  },
  oih_etf: {
    novice: "VanEck Oil Services ETF (OIH) — US oilfield services sentiment.",
    provider: "Yahoo Finance (OIH)",
    url: "https://finance.yahoo.com/quote/OIH",
  },
  goldbees: {
    novice: "Nippon India Gold BeES — rupee-denominated gold ETF on NSE (MCX-linked NAV).",
    provider: "Yahoo Finance (GOLDBEES.NS)",
    url: "https://finance.yahoo.com/quote/GOLDBEES.NS",
  },
  silverbees: {
    novice: "Nippon India Silver BeES — rupee silver ETF on NSE.",
    provider: "Yahoo Finance (SILVERBEES.NS)",
    url: "https://finance.yahoo.com/quote/SILVERBEES.NS",
  },
  nifty_metal: {
    novice: "Nifty Metal index — basket of large Indian metals producers; tracks domestic metal equity beta.",
    provider: "NSE / Yahoo Finance",
    url: "https://finance.yahoo.com/quote/%5ECNXMETAL",
  },
  nifty_energy: {
    novice: "Nifty Energy index — oil, gas, and power names listed on NSE.",
    provider: "NSE / Yahoo Finance",
    url: "https://finance.yahoo.com/quote/%5ECNXENERGY",
  },
  ongc_equity: {
    novice: "Oil & Natural Gas Corp — flagship upstream PSU; crude price and subsidy policy sensitive.",
    provider: "NSE / Yahoo Finance",
    url: "https://finance.yahoo.com/quote/ONGC.NS",
  },
  coalindia_equity: {
    novice: "Coal India — domestic coal supply benchmark for power and metals.",
    provider: "NSE / Yahoo Finance",
    url: "https://finance.yahoo.com/quote/COALINDIA.NS",
  },
  hindalco_equity: {
    novice: "Hindalco — integrated aluminum and copper; LME metal price beta.",
    provider: "NSE / Yahoo Finance",
    url: "https://finance.yahoo.com/quote/HINDALCO.NS",
  },
  tatasteel_equity: {
    novice: "Tata Steel — steel cycle proxy for India infra and global HRC spreads.",
    provider: "NSE / Yahoo Finance",
    url: "https://finance.yahoo.com/quote/TATASTEEL.NS",
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
  aud_inr: {
    novice: "Australian Dollar vs Rupee — coal, metals, and education/travel flows.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/AUDINR=X",
  },
  cad_inr: {
    novice: "Canadian Dollar vs Rupee — energy and immigration-linked remittance context.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/CADINR=X",
  },
  chf_inr: {
    novice: "Swiss Franc vs Rupee — safe-haven FX; pharma and luxury imports.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/CHFINR=X",
  },
  sgd_inr: {
    novice: "Singapore Dollar vs Rupee — ASEAN trade hub and NRI remittance corridor.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/SGDINR=X",
  },
  nzd_inr: {
    novice: "New Zealand Dollar vs Rupee — dairy exports and student migration flows.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/NZDINR=X",
  },
  eurusd: {
    novice: "World’s most traded pair — Euro vs US Dollar; risk and rate differential bellwether.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/EURUSD=X",
  },
  gbpusd: {
    novice: "Pound vs US Dollar — UK rates, gilt moves, and global risk sentiment.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/GBPUSD=X",
  },
  usdjpy: {
    novice: "US Dollar vs Yen — classic risk-on/risk-off gauge; BoJ policy sensitive.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/USDJPY=X",
  },
  usdcad: {
    novice: "US Dollar vs Canadian Dollar — oil-linked North American cross.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/USDCAD=X",
  },
  usdchf: {
    novice: "US Dollar vs Swiss Franc — haven demand when volatility spikes.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/USDCHF=X",
  },
  audusd: {
    novice: "Australian Dollar vs US Dollar — China growth and commodity beta.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/AUDUSD=X",
  },
  nzdusd: {
    novice: "New Zealand Dollar vs US Dollar — dairy cycle and carry-trade proxy.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/NZDUSD=X",
  },
  usdcnh: {
    novice: "US Dollar vs offshore Chinese Yuan — trade and EM Asia sentiment.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/USDCNH=X",
  },
  usdsgd: {
    novice: "US Dollar vs Singapore Dollar — regional FX anchor for ASEAN.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/USDSGD=X",
  },
  eurgbp: {
    novice: "Euro vs Pound — UK–EU trade and rate spread without USD leg.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/EURGBP=X",
  },
  eurjpy: {
    novice: "Euro vs Yen — global risk appetite outside the USD.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/EURJPY=X",
  },
  gbpjpy: {
    novice: "Pound vs Yen — volatile cross; risk and UK rate sensitivity.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/GBPJPY=X",
  },
  usdmxn: {
    novice: "US Dollar vs Mexican Peso — US manufacturing supply chain FX.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/USDMXN=X",
  },
  usdbrl: {
    novice: "US Dollar vs Brazilian Real — LatAm risk and commodity exporter FX.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/USDBRL=X",
  },
  usdzar: {
    novice: "US Dollar vs South African Rand — EM high-beta; gold and mining linkage.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/USDZAR=X",
  },
  usdkrw: {
    novice: "US Dollar vs Korean Won — semiconductor export cycle and Asia risk.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/USDKRW=X",
  },
  usdtry: {
    novice: "US Dollar vs Turkish Lira — high-volatility EM; inflation and policy risk.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/USDTRY=X",
  },
  usdtwd: {
    novice: "US Dollar vs Taiwan Dollar — tech supply chain and export-heavy economy.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/USDTWD=X",
  },
  usdidr: {
    novice: "US Dollar vs Indonesian Rupiah — ASEAN commodity demand and rate differential.",
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/quote/USDIDR=X",
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
