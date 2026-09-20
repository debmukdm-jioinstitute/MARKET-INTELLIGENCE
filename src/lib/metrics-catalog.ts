export interface MetricDefinition {
  id: string;
  name: string;
  category:
    | "Benchmark Index"
    | "Market Internals"
    | "Macroeconomics"
    | "Central Banking"
    | "Portfolio Risk"
    | "Portfolio Performance"
    | "Valuation Multiples"
    | "Technical Analysis"
    | "Commodities & FX"
    | "Corporate Disclosures"
    | "Institutional Flows"
    | "Global Markets & FX";
  provider: string;
  defaultUrl: string;
  calculation: string;
  laymanExplanation: string;
  utility: string;
}

export const METRICS_CATALOG: Record<string, MetricDefinition> = {
  // Benchmark Indices
  nifty50: {
    id: "nifty50",
    name: "NIFTY 50 Index",
    category: "Benchmark Index",
    provider: "NSE India (National Stock Exchange)",
    defaultUrl: "https://www.nseindia.com/products-services/indices-nifty50-index",
    calculation:
      "Calculated using the Free-Float Market Capitalization weighted methodology. Index Value = (Current Free Float Market Cap of 50 Constituents / Base Market Cap) × 1000. Base date: Nov 3, 1995.",
    laymanExplanation:
      "A barometer of India's corporate economy tracking the 50 largest and most actively traded blue-chip companies across 13 major sectors.",
    utility:
      "Used by fund managers and individual investors as the primary benchmark to measure if their investment portfolio is beating the broad Indian stock market.",
  },
  sensex: {
    id: "sensex",
    name: "S&P BSE SENSEX",
    category: "Benchmark Index",
    provider: "BSE India (Bombay Stock Exchange)",
    defaultUrl: "https://www.bseindia.com/sensex/indexview.html",
    calculation:
      "Free-float market capitalization weighted index of 30 financially sound, mega-cap companies listed on BSE. Base year: 1978-79 = 100.",
    laymanExplanation:
      "India's oldest stock market index representing 30 premier companies listed on the Bombay Stock Exchange.",
    utility:
      "Serves as the headline indicator of investor sentiment and mega-cap corporate financial health across India.",
  },
  banknifty: {
    id: "banknifty",
    name: "NIFTY BANK Index",
    category: "Benchmark Index",
    provider: "NSE India",
    defaultUrl: "https://www.nseindia.com/products-services/indices-nifty-bank-index",
    calculation:
      "Free-float market cap weighted index of the 12 most liquid and large-capitalized banking stocks listed on NSE. No single stock weight exceeds 33%.",
    laymanExplanation:
      "Tracks the performance of India's major commercial banking sector, comprising frontline private (HDFC, ICICI, Axis) and public (SBI) lenders.",
    utility:
      "Crucial gauge of banking credit cycle, interest rate sensitivity, and economic liquidity transmission across India.",
  },
  vix: {
    id: "vix",
    name: "INDIA VIX (Volatility Index)",
    category: "Market Internals",
    provider: "NSE India",
    defaultUrl: "https://www.nseindia.com/market-data/vix",
    calculation:
      "Derived from bid-ask quotes of near and next-month NIFTY index option contracts using the Black-Scholes/CBOE computation algorithm. Represents expected annualized volatility over the next 30 calendar days.",
    laymanExplanation:
      "Commonly called the market's 'fear gauge'. It measures how much turbulence, swing, or panic option traders expect in the NIFTY over the coming month.",
    utility:
      "Values below 13 signal calm/complacency; readings above 20 warn of sharp price swings, rising hedging costs, and heightened market anxiety.",
  },

  // Market Internals & Breadth
  breadth: {
    id: "breadth",
    name: "Market Breadth (Advances / Declines)",
    category: "Market Internals",
    provider: "NSE India Live Indices Feed",
    defaultUrl: "https://www.nseindia.com/market-data/live-equity-market",
    calculation:
      "Advance/Decline Ratio = Total Number of Advancing Equities (Close > Prev Close) ÷ Total Number of Declining Equities (Close < Prev Close) across the traded universe.",
    laymanExplanation:
      "Tells you how many stocks are participating in the market's move. If the headline index is rising but more individual stocks are falling, the rally is fragile.",
    utility:
      "A healthy, durable bull market shows strong positive breadth (more stocks going up than down). Net advances confirm whether a rally has broad underlying participation.",
  },
  high52w: {
    id: "high52w",
    name: "52-Week High Count",
    category: "Market Internals",
    provider: "NSE India Live Analysis API",
    defaultUrl: "https://www.nseindia.com/market-data/52-week-high-equity-market",
    calculation:
      "Count of active securities whose current intraday price reaches or exceeds the highest traded price recorded over the rolling preceding 52 calendar weeks (252 trading sessions).",
    laymanExplanation:
      "How many stocks are trading at their highest price in the past full year.",
    utility:
      "A rising count of 52-week highs signals expanding leadership and institutional momentum across diverse industry sectors.",
  },
  low52w: {
    id: "low52w",
    name: "52-Week Low Count",
    category: "Market Internals",
    provider: "NSE India Live Analysis API",
    defaultUrl: "https://www.nseindia.com/market-data/52-week-low-equity-market",
    calculation:
      "Count of active securities whose current intraday price reaches or drops below the lowest traded price recorded over the rolling preceding 52 calendar weeks.",
    laymanExplanation:
      "How many stocks are trading at their absolute worst price level over the past year.",
    utility:
      "A spike in 52-week lows warns of broad-based selling pressure, severe structural deterioration, or liquidity withdrawal.",
  },
  turnover: {
    id: "turnover",
    name: "Cash Market Turnover",
    category: "Market Internals",
    provider: "NSE India Capital Market Segment",
    defaultUrl: "https://www.nseindia.com/market-data/market-pulse",
    calculation:
      "Sum of (Traded Volume × Execution Price) for all executed equity transactions during the trading session on the NSE Cash Market.",
    laymanExplanation:
      "The total rupee amount of actual shares bought and sold today in the stock exchange.",
    utility:
      "High turnover on up days confirms heavy institutional accumulation; low volume rallies often indicate lack of conviction.",
  },

  // Macroeconomics
  cpi: {
    id: "cpi",
    name: "Consumer Price Index (CPI) Inflation",
    category: "Macroeconomics",
    provider: "MOSPI (Ministry of Statistics and Programme Implementation)",
    defaultUrl: "https://www.mospi.gov.in/cpi",
    calculation:
      "Laspeyres formula weighted basket measuring price changes of retail goods and services consumed by rural and urban households: Index = [Σ (P_t × Q_0) / Σ (P_0 × Q_0)] × 100. Headline YoY % is calculated against the corresponding month of previous year.",
    laymanExplanation:
      "The cost of everyday living for an average family (food, fuel, clothing, housing). If CPI is 4.2%, a basket of goods that cost ₹100 last year now costs ₹104.20.",
    utility:
      "The RBI's primary policy target (4% ± 2%). High CPI forces RBI to hike interest rates (making EMIs costlier); low CPI gives room for interest rate cuts.",
  },
  gdp: {
    id: "gdp",
    name: "Real GDP Growth Rate",
    category: "Macroeconomics",
    provider: "MOSPI / Central Statistics Office (CSO)",
    defaultUrl: "https://www.mospi.gov.in/national-accounts-division-nad",
    calculation:
      "YoY percentage change in Gross Domestic Product measured at constant base-year (2011-12) prices: GDP_growth = [(Real GDP_t − Real GDP_t-1) / Real GDP_t-1] × 100.",
    laymanExplanation:
      "The overall economic growth score of the country, stripping out the artificial effect of inflation. Shows how much more goods and services India produced.",
    utility:
      "High GDP growth indicates robust consumer demand, rising factory output, and strong corporate revenue growth potential.",
  },
  repo: {
    id: "repo",
    name: "RBI Policy Repo Rate",
    category: "Central Banking",
    provider: "Reserve Bank of India (Monetary Policy Committee)",
    defaultUrl: "https://www.rbi.org.in/scripts/PolicyRates.aspx",
    calculation:
      "The benchmark interest rate fixed bi-monthly by the RBI Monetary Policy Committee (MPC) under Section 45ZB of the RBI Act at which RBI lends overnight funds to commercial banks against pledged government collateral.",
    laymanExplanation:
      "The base interest rate of the entire Indian financial system. When RBI changes this rate, banks soon change interest rates on your home loans, car loans, and fixed deposits.",
    utility:
      "Lowering repo rate stimulates business borrowing and stock market valuations; raising repo rate cools inflation and curbs asset bubbles.",
  },
  sdf: {
    id: "sdf",
    name: "Standing Deposit Facility (SDF) Rate",
    category: "Central Banking",
    provider: "Reserve Bank of India (Monetary Policy Committee)",
    defaultUrl: "https://www.rbi.org.in/scripts/PolicyRates.aspx",
    calculation:
      "The floor rate of the Liquidity Adjustment Facility (LAF) corridor, pegged at 25 bps below the Repo Rate. Allows RBI to absorb surplus liquidity from commercial banks without having to provide government securities as collateral.",
    laymanExplanation:
      "The interest rate banks earn when they park their extra spare cash overnight with the Reserve Bank of India.",
    utility:
      "Serves as the operational floor rate for short-term interbank call money markets.",
  },
  msf: {
    id: "msf",
    name: "Marginal Standing Facility (MSF) Rate",
    category: "Central Banking",
    provider: "Reserve Bank of India",
    defaultUrl: "https://www.rbi.org.in/scripts/PolicyRates.aspx",
    calculation:
      "The penal upper ceiling rate of the LAF corridor, pegged at 25 bps above the Repo Rate. Banks can borrow overnight emergency funds from RBI dipping into their Statutory Liquidity Ratio (SLR) quota.",
    laymanExplanation:
      "The emergency overnight loan rate banks pay to borrow cash when they face an unexpected liquidity squeeze at the end of the day.",
    utility:
      "Prevents extreme spikes in interbank lending rates during acute liquidity shortages.",
  },
  crr: {
    id: "crr",
    name: "Cash Reserve Ratio (CRR)",
    category: "Central Banking",
    provider: "Reserve Bank of India",
    defaultUrl: "https://www.rbi.org.in/scripts/PolicyRates.aspx",
    calculation:
      "The mandatory minimum percentage of Net Demand and Time Liabilities (NDTL) that commercial banks must maintain as non-interest-bearing cash balances with the Reserve Bank of India.",
    laymanExplanation:
      "The percentage of total public deposits that banks are legally forbidden from lending out and must keep locked up in cash with the RBI.",
    utility:
      "A direct lever for credit creation. Hiking CRR by 50 bps locks up over ₹1.5 lakh crore of liquidity from the banking system.",
  },
  slr: {
    id: "slr",
    name: "Statutory Liquidity Ratio (SLR)",
    category: "Central Banking",
    provider: "Reserve Bank of India",
    defaultUrl: "https://www.rbi.org.in/scripts/PolicyRates.aspx",
    calculation:
      "The minimum percentage of Net Demand and Time Liabilities (NDTL) that commercial banks must maintain in approved liquid assets (predominantly Central and State Government Securities).",
    laymanExplanation:
      "The portion of customer deposits banks must invest into safe Indian government bonds.",
    utility:
      "Guarantees that banks hold ample liquid sovereign assets to honor depositor withdrawals while creating guaranteed institutional demand for government borrowing.",
  },
  gsec10y: {
    id: "gsec10y",
    name: "10-Year Government of India Bond Yield (10Y G-Sec)",
    category: "Macroeconomics",
    provider: "CCIL / RBI NDS-OM / FRED (OECD)",
    defaultUrl: "https://fred.stlouisfed.org/series/INDIRLTLT01STM",
    calculation:
      "Annualized Yield to Maturity (YTM) of the benchmark 10-year sovereign government bond traded on RBI's NDS-OM platform: Price = Σ [Coupon / (1+y)^t] + [Principal / (1+y)^10].",
    laymanExplanation:
      "The annual return India's government pays to borrow money for 10 years. Because government default risk is virtually zero, this is the 'risk-free' rate of India.",
    utility:
      "Forms the foundation of all discount rates used to value stocks. When bond yields rise, stock valuations compress because safer government bonds become more attractive.",
  },
  pmi_mfg: {
    id: "pmi_mfg",
    name: "PMI Manufacturing Index",
    category: "Macroeconomics",
    provider: "S&P Global / HSBC India",
    defaultUrl: "https://www.pmi.spglobal.com",
    calculation:
      "Diffusion index compiled from monthly survey responses of over 400 purchasing managers across five pillars: New Orders (30%), Output (25%), Employment (20%), Suppliers' Delivery Times (15%), Stocks of Purchases (10%).",
    laymanExplanation:
      "A monthly report card from factory managers. A reading above 50 means factories are expanding; below 50 means manufacturing activity is contracting.",
    utility:
      "Leading indicator released weeks before official GDP, providing early confirmation of factory demand and export strength.",
  },
  pmi_services: {
    id: "pmi_services",
    name: "PMI Services Index",
    category: "Macroeconomics",
    provider: "S&P Global / HSBC India",
    defaultUrl: "https://www.pmi.spglobal.com",
    calculation:
      "Survey-based diffusion index tracking business activity, new work, outstanding business, and employment across Indian service companies (IT, finance, hospitality, logistics).",
    laymanExplanation:
      "Measures business momentum across India's dominant service sector (which accounts for over 50% of the entire economy).",
    utility:
      "Signals whether hiring, wage growth, and urban consumer demand are accelerating or softening.",
  },
  liquidity: {
    id: "liquidity",
    name: "Banking System Net Liquidity",
    category: "Central Banking",
    provider: "Reserve Bank of India (Operations / WSS)",
    defaultUrl: "https://www.rbi.org.in/Scripts/WSSView.aspx",
    calculation:
      "Net absorbing/injecting balance calculated as: [Standing Deposit Facility (SDF) + Reverse Repo absorption] − [Repo + Marginal Standing Facility (MSF) injection]. Positive = Surplus, Negative = Deficit.",
    laymanExplanation:
      "The surplus cash sitting idle in Indian commercial banks overnight. A surplus means banks have plenty of money to lend; a deficit means cash is tight.",
    utility:
      "Surplus liquidity keeps interbank rates low and supports credit growth; deficit liquidity forces banks to hike deposit rates to attract fresh funds.",
  },
  fx_reserves: {
    id: "fx_reserves",
    name: "Foreign Exchange (FX) Reserves",
    category: "Central Banking",
    provider: "Reserve Bank of India (Weekly Statistical Supplement)",
    defaultUrl: "https://www.rbi.org.in/scripts/WSSViewDetail.aspx",
    calculation:
      "Total valuation in US Dollars of foreign currency assets, physical gold held in reserves, Special Drawing Rights (SDRs) with the IMF, and reserve tranche position.",
    laymanExplanation:
      "India's financial war chest of foreign currency and gold. It guarantees India can always pay for imported oil, electronics, and defense items, and defend the Rupee during a crisis.",
    utility:
      "High reserves give the RBI immense ammunition to prevent wild speculative collapses in the Rupee during global financial turmoil.",
  },

  // Global Macro & FX
  sp500: {
    id: "sp500",
    name: "S&P 500 Index (^GSPC)",
    category: "Global Markets & FX",
    provider: "S&P Dow Jones Indices / Yahoo Finance",
    defaultUrl: "https://finance.yahoo.com/quote/%5EGSPC",
    calculation:
      "Market-cap weighted index tracking 500 of the largest publicly traded corporations in the United States, representing ~80% of total US equity market value.",
    laymanExplanation:
      "The gold-standard yardstick of the US economy and global corporate earnings power.",
    utility:
      "Global risk benchmark. When S&P 500 rallies, foreign institutional investors (FIIs) are generally confident and willing to invest in emerging markets like India.",
  },
  nasdaq: {
    id: "nasdaq",
    name: "NASDAQ Composite (^IXIC)",
    category: "Global Markets & FX",
    provider: "NASDAQ / Yahoo Finance",
    defaultUrl: "https://finance.yahoo.com/quote/%5EIXIC",
    calculation:
      "Market capitalization weighted index of over 3,000 common equities listed on the Nasdaq stock exchange, heavily weighted towards technology, software, and biotech.",
    laymanExplanation:
      "The world's technology innovation index (Apple, Microsoft, Nvidia, Google, Amazon).",
    utility:
      "Direct driver of Indian IT service stocks (TCS, Infosys, Wipro). Strong NASDAQ tech spending correlates directly with Indian IT outsourcing revenues.",
  },
  us10y: {
    id: "us10y",
    name: "US 10-Year Treasury Yield (^TNX)",
    category: "Global Markets & FX",
    provider: "CBOE / US Department of the Treasury / Yahoo Finance",
    defaultUrl: "https://finance.yahoo.com/quote/%5ETNX",
    calculation:
      "Yield to maturity of the most recently auctioned 10-year US Treasury benchmark note, quoted in annualized percentage points.",
    laymanExplanation:
      "The ultimate risk-free interest rate of the world economy.",
    utility:
      "When US 10Y yields spike, global capital flows back into US Dollars, often causing foreign investors (FIIs) to pull money out of Indian equities.",
  },
  dxy: {
    id: "dxy",
    name: "US Dollar Index (DXY)",
    category: "Commodities & FX",
    provider: "ICE (Intercontinental Exchange) / Yahoo Finance",
    defaultUrl: "https://finance.yahoo.com/quote/DX-Y.NYB",
    calculation:
      "Geometrically weighted average of the US Dollar against a basket of 6 major foreign currencies: Euro (57.6%), Japanese Yen (13.6%), British Pound (11.9%), Canadian Dollar (9.1%), Swedish Krona (4.2%), Swiss Franc (3.6%).",
    laymanExplanation:
      "Measures the strength of the US Dollar against other major global currencies.",
    utility:
      "A weakening Dollar (DXY falling) is historically bullish for Indian equities, commodities, and emerging market currency stability.",
  },
  usdinr: {
    id: "usdinr",
    name: "USD / INR Spot Exchange Rate",
    category: "Commodities & FX",
    provider: "Interbank Foreign Exchange / Yahoo Finance / RBI",
    defaultUrl: "https://finance.yahoo.com/quote/INR%3DX",
    calculation:
      "Market determined spot exchange rate quoting the number of Indian Rupees required to purchase one United States Dollar in the interbank currency market.",
    laymanExplanation:
      "How many Rupees you must pay to buy $1 USD.",
    utility:
      "A depreciating Rupee increases import costs for crude oil and electronics, while boosting revenue realizations for exporters (IT and Pharma).",
  },
  brent: {
    id: "brent",
    name: "Brent Crude Oil Futures (BZ=F)",
    category: "Commodities & FX",
    provider: "ICE Futures Europe / Yahoo Finance",
    defaultUrl: "https://finance.yahoo.com/quote/BZ%3DF",
    calculation:
      "Price in USD per barrel (42 US gallons) for light, sweet North Sea crude oil traded for front-month physical delivery settlement on ICE.",
    laymanExplanation:
      "The global benchmark price for a barrel of crude oil.",
    utility:
      "India imports over 85% of its crude oil requirements. Higher crude oil prices widen India's trade deficit, pressure the Rupee, and compress margins for paint, aviation, and tyre companies.",
  },
  gold: {
    id: "gold",
    name: "Gold Futures (GC=F)",
    category: "Commodities & FX",
    provider: "COMEX / CME Group / Yahoo Finance",
    defaultUrl: "https://finance.yahoo.com/quote/GC%3DF",
    calculation:
      "Price in USD per troy ounce (31.1035 grams) for standard 100 oz gold futures contracts traded on COMEX.",
    laymanExplanation:
      "The timeless hedge against inflation, currency debasement, and geopolitical conflict.",
    utility:
      "Investors flock to gold during wars, recessions, or bank crises. In India, gold also reflects wedding season demand and rural savings health.",
  },

  // Portfolio KPIs & Risk
  nav: {
    id: "nav",
    name: "Portfolio NAV / Total Value",
    category: "Portfolio Performance",
    provider: "Antigravity Real-Time Valuation Engine",
    defaultUrl: "/portfolio",
    calculation:
      "NAV = Σ (Shares_i × Live Price_i, converted to base currency INR) + Available Cash Balance.",
    laymanExplanation:
      "The total current cash worth of all your stock holdings plus uninvested cash right now.",
    utility:
      "The core number against which all your portfolio gains, losses, fees, and allocations are calculated.",
  },
  today_pnl: {
    id: "today_pnl",
    name: "Today's P&L (Unrealized Day Gain/Loss)",
    category: "Portfolio Performance",
    provider: "Antigravity Real-Time Valuation Engine",
    defaultUrl: "/portfolio",
    calculation:
      "Today's P&L = Σ [Shares_i × (Current Price_i − Previous Close Price_i)]. Day Return % = Today's P&L ÷ (Opening NAV of the session).",
    laymanExplanation:
      "How much money your portfolio made or lost specifically during today's trading session.",
    utility:
      "Enables intraday tracking of whether your stocks are rising or falling in sync with today's broader market move.",
  },
  total_return: {
    id: "total_return",
    name: "Total Return (Cumulative)",
    category: "Portfolio Performance",
    provider: "Antigravity Real-Time Valuation Engine",
    defaultUrl: "/portfolio",
    calculation:
      "Total Return % = [(Current NAV + Net Cash Withdrawals) − (Total Inception Capital + Net Cash Additions)] ÷ Total Invested Capital.",
    laymanExplanation:
      "The total percentage gain you have made on every rupee invested since your very first deposit.",
    utility:
      "The bottom line metric of whether your long-term investment strategy has generated actual wealth.",
  },
  alpha: {
    id: "alpha",
    name: "Jensen's Alpha (vs NIFTY 50)",
    category: "Portfolio Performance",
    provider: "Antigravity Institutional Analytics",
    defaultUrl: "/attribution",
    calculation:
      "Jensen's Alpha = Portfolio Return − [Risk-Free Rate + Beta × (Benchmark Return − Risk-Free Rate)], annualized over 252 trading days.",
    laymanExplanation:
      "Measures genuine stock-picking skill. It answers: 'Did you beat the market because of smart decisions, or did you just take on extra wild risks?' Positive alpha means true outperformance.",
    utility:
      "An alpha of +2.3% means you generated 2.3% extra profit above what a passive index fund with the same risk level would have delivered.",
  },
  beta: {
    id: "beta",
    name: "Portfolio Beta",
    category: "Portfolio Risk",
    provider: "Antigravity Institutional Analytics",
    defaultUrl: "/risk",
    calculation:
      "Beta = Covariance(Daily Portfolio Returns, Daily Benchmark Returns) ÷ Variance(Daily Benchmark Returns). Calculated over trailing 252 trading sessions.",
    laymanExplanation:
      "How sensitive your portfolio is to general market swings. A beta of 1.0 moves exactly with NIFTY; a beta of 1.2 moves 20% more aggressively in both directions.",
    utility:
      "Conservative investors prefer beta < 0.9 (defensive); aggressive growth investors accept beta > 1.1 during bull markets.",
  },
  sharpe: {
    id: "sharpe",
    name: "Sharpe Ratio",
    category: "Portfolio Performance",
    provider: "Antigravity Institutional Analytics",
    defaultUrl: "/quant",
    calculation:
      "Sharpe Ratio = (Annualized Portfolio Return − Annualized Risk-Free Rate) ÷ Annualized Portfolio Volatility (Standard Deviation × √252).",
    laymanExplanation:
      "Risk-adjusted reward efficiency. It tells you how much extra return you earned for each unit of rollercoaster bumpiness you endured.",
    utility:
      "Sharpe > 1.0 is considered good; > 2.0 is institutional quality. Allows fair comparison between a high-return bumpy tech portfolio and a steady blue-chip book.",
  },
  max_drawdown: {
    id: "max_drawdown",
    name: "Maximum Drawdown (Peak-to-Trough Loss)",
    category: "Portfolio Risk",
    provider: "Antigravity Institutional Analytics",
    defaultUrl: "/risk",
    calculation:
      "MDD = Min [(NAV_t − Peak NAV_τ) ÷ Peak NAV_τ] for all τ ≤ t over the historical evaluation window.",
    laymanExplanation:
      "The worst percentage drop from the highest peak to the lowest valley that your portfolio ever suffered before recovering.",
    utility:
      "Tests the psychological stress limit. If a portfolio has a −30% max drawdown, can you stomach holding through that decline without panic selling at the bottom?",
  },
  concentration: {
    id: "concentration",
    name: "Sector / Asset Concentration",
    category: "Portfolio Risk",
    provider: "Antigravity Institutional Analytics",
    defaultUrl: "/allocation",
    calculation:
      "Sector Weight % = [Σ (Market Value of Holdings in Sector_k) ÷ Total Portfolio NAV] × 100.",
    laymanExplanation:
      "How many of your eggs are in one basket. If Financials is 27%, more than a quarter of your total net worth depends on bank earnings and interest rate policies.",
    utility:
      "Exposes hidden risks. High concentration in one sector makes you vulnerable if government regulations or commodity prices change.",
  },

  // Valuation Multiples
  pe_ratio: {
    id: "pe_ratio",
    name: "Price-to-Earnings Ratio (P/E)",
    category: "Valuation Multiples",
    provider: "NSE India / Index Valuation Reports",
    defaultUrl: "https://www.nseindia.com/reports-indices-historical-pepb",
    calculation:
      "Index P/E = Total Free-Float Market Capitalization of Constituents ÷ Aggregate Net Trailing 12-Month Net Profits (PAT) of Constituents.",
    laymanExplanation:
      "How many rupees investors are willing to pay today for every ₹1 of annual profit earned by the company or index. A P/E of 21x means you pay ₹21 for ₹1 of earnings.",
    utility:
      "High P/E (>24x) suggests optimism or expensive valuation; low P/E (<18x) suggests undervaluation or temporary earnings trouble.",
  },
  pb_ratio: {
    id: "pb_ratio",
    name: "Price-to-Book Ratio (P/B)",
    category: "Valuation Multiples",
    provider: "NSE India",
    defaultUrl: "https://www.nseindia.com/reports-indices-historical-pepb",
    calculation:
      "Index P/B = Total Free-Float Market Cap ÷ Net Book Value (Total Assets minus Total Liabilities / Shareholders' Equity).",
    laymanExplanation:
      "Compares the stock market price against the accounting net asset value of the company's real assets if it were liquidated today.",
    utility:
      "Standard valuation metric for asset-heavy businesses like banks, utilities, and infrastructure companies.",
  },
  div_yield: {
    id: "div_yield",
    name: "Dividend Yield",
    category: "Valuation Multiples",
    provider: "NSE India",
    defaultUrl: "https://www.nseindia.com/reports-indices-historical-pepb",
    calculation:
      "Dividend Yield % = [Total Cash Dividends Paid over Trailing 12 Months ÷ Total Market Capitalization] × 100.",
    laymanExplanation:
      "The cash cash-back percentage you receive each year simply for owning the stock, before any share price appreciation.",
    utility:
      "Higher dividend yields provide downside cash protection during market sell-offs and serve as an income stream for long-term investors.",
  },
  yield_spread: {
    id: "yield_spread",
    name: "Bond-Equity Yield Spread",
    category: "Valuation Multiples",
    provider: "Antigravity Cross-Asset Engine",
    defaultUrl: "/markets/valuation",
    calculation:
      "Yield Spread (bps) = 10Y G-Sec Sovereign Yield − NIFTY 50 Earnings Yield (where Earnings Yield = 1 / P/E × 100).",
    laymanExplanation:
      "Compares the guaranteed return on safe government bonds with the earnings return on risky stocks. Shows which asset class is cheaper.",
    utility:
      "When the spread is very high (>250 bps), bonds are offering attractive yields compared to stocks, prompting asset allocators to shift money into debt.",
  },

  // Technical & Momentum
  dma: {
    id: "dma",
    name: "Daily Moving Averages (20 / 50 / 200 DMA)",
    category: "Technical Analysis",
    provider: "Technical Computation on NSE / Yahoo Daily Closes",
    defaultUrl: "/markets/momentum",
    calculation:
      "SMA_N = (P_1 + P_2 + ... + P_N) ÷ N, where N = 20 (short-term trend), 50 (intermediate trend), or 200 (long-term structural regime).",
    laymanExplanation:
      "The average closing price over the last 20, 50, or 200 days, smoothing out daily wiggles to reveal the real underlying direction.",
    utility:
      "Trading above the 200 DMA confirms an ongoing multi-month bull market; dropping below signals a dangerous structural downtrend.",
  },
  rsi: {
    id: "rsi",
    name: "Relative Strength Index (RSI 14-Day)",
    category: "Technical Analysis",
    provider: "Wilder's RSI Calculation on Daily Closes",
    defaultUrl: "/markets/momentum",
    calculation:
      "RSI = 100 − [100 / (1 + RS)], where RS = Average Gain of Up Sessions over 14 Days ÷ Average Loss of Down Sessions over 14 Days.",
    laymanExplanation:
      "A momentum speedometer between 0 and 100. Above 70 means the stock has rallied too fast and might be 'overbought' (due for a pause); below 30 means it has plunged too fast ('oversold').",
    utility:
      "Helps traders avoid buying at the absolute peak of an exhausted rally or panic-selling at the bottom of a temporary washout.",
  },
  macd: {
    id: "macd",
    name: "MACD (Moving Average Convergence Divergence)",
    category: "Technical Analysis",
    provider: "Trend Indicator on Daily Closes",
    defaultUrl: "/markets/momentum",
    calculation:
      "MACD Line = 12-Day Exponential Moving Average (EMA) − 26-Day EMA. Signal Line = 9-Day EMA of MACD Line. Histogram = MACD Line − Signal Line.",
    laymanExplanation:
      "Shows whether short-term momentum is speeding up faster than medium-term momentum. A positive histogram means upward momentum is expanding.",
    utility:
      "Used by trend-followers to detect early turning points and confirm breakout strength.",
  },

  // Institutional Flows & Derivatives
  fii_flow: {
    id: "fii_flow",
    name: "FII / FPI Institutional Cash Flow",
    category: "Institutional Flows",
    provider: "NSE / NSDL / SEBI Official Trading Reports",
    defaultUrl: "https://www.nseindia.com/reports/fii-dii",
    calculation:
      "Net FII = Total Gross Cash Equities Purchased by Foreign Institutional Investors − Total Gross Cash Equities Sold by Foreign Institutional Investors in the session.",
    laymanExplanation:
      "The net amount of foreign institutional money flowing into or out of Indian stocks each day.",
    utility:
      "FIIs manage trillions of dollars. Sustained FII buying drives strong multi-month index rallies, while sustained selling creates heavy headwinds.",
  },
  dii_flow: {
    id: "dii_flow",
    name: "DII Institutional Cash Flow",
    category: "Institutional Flows",
    provider: "NSE / BSE Trading Reports",
    defaultUrl: "https://www.nseindia.com/reports/fii-dii",
    calculation:
      "Net DII = Total Gross Purchases minus Total Gross Sales executed by Domestic Mutual Funds, Insurance companies (LIC), and Pension Funds.",
    laymanExplanation:
      "The money invested into the stock market by domestic institutions (mostly fueled by monthly SIP contributions from Indian retail citizens).",
    utility:
      "DII buying provides a powerful cushion that absorbs foreign selling and keeps Indian markets resilient during global volatility.",
  },
  pcr: {
    id: "pcr",
    name: "Put / Call Ratio (PCR)",
    category: "Institutional Flows",
    provider: "NSE Derivatives Segment / Upstox Option Chain",
    defaultUrl: "https://www.nseindia.com/market-data/option-chain",
    calculation:
      "PCR = Total Open Interest of all Put Option Contracts ÷ Total Open Interest of all Call Option Contracts for the active expiry series.",
    laymanExplanation:
      "Compares how many bearish insurance bets (Puts) exist compared to bullish bets (Calls).",
    utility:
      "Used as a contrarian indicator: A very high PCR (>1.3) means excessive fear, often signaling an impending market bounce. A low PCR (<0.7) warns of complacency.",
  },
  max_pain: {
    id: "max_pain",
    name: "Max Pain Strike Price",
    category: "Institutional Flows",
    provider: "NSE Derivatives Analytics",
    defaultUrl: "https://www.nseindia.com/market-data/option-chain",
    calculation:
      "The specific strike price at which the total financial payout to all option buyers (Calls and Puts combined) would be at its minimum upon expiry.",
    laymanExplanation:
      "The price point where option sellers (typically well-capitalized institutions) make the most profit and option buyers lose the most money on expiry day.",
    utility:
      "Stock and index prices have a strong mathematical tendency to gravitate towards the Max Pain strike as weekly/monthly expiry approaches.",
  },

  // Advanced Breadth & Momentum metrics
  advances: {
    id: "advances",
    name: "Advancing Equities Count",
    category: "Market Internals",
    provider: "NSE India Live Market Pulse API",
    defaultUrl: "https://www.nseindia.com/market-data/live-equity-market",
    calculation:
      "Count of traded stocks where Current Market Price (CMP) > Previous Day's Closing Price at the exchange snapshot time.",
    laymanExplanation:
      "The number of individual stocks that are trading in the green (gaining value) compared to yesterday's close.",
    utility:
      "Indicates how broad market strength is. If 1,500 stocks advance while only 500 decline, gains are widespread across diverse companies.",
  },
  declines: {
    id: "declines",
    name: "Declining Equities Count",
    category: "Market Internals",
    provider: "NSE India Live Market Pulse API",
    defaultUrl: "https://www.nseindia.com/market-data/live-equity-market",
    calculation:
      "Count of traded stocks where Current Market Price (CMP) < Previous Day's Closing Price at the exchange snapshot time.",
    laymanExplanation:
      "The number of individual stocks that are trading in the red (losing value) compared to yesterday's close.",
    utility:
      "A surge in declining stocks signals broad selling pressure across secondary and small-cap segments even if a few index heavyweights are holding up the index.",
  },
  unchanged: {
    id: "unchanged",
    name: "Unchanged Equities Count",
    category: "Market Internals",
    provider: "NSE India Live Market Pulse API",
    defaultUrl: "https://www.nseindia.com/market-data/live-equity-market",
    calculation:
      "Count of traded stocks where Current Market Price (CMP) equals Previous Day's Closing Price.",
    laymanExplanation:
      "Stocks that have traded today but whose current price is exactly the same as where they closed yesterday.",
    utility:
      "Measures neutral liquidity in stocks without net directional bias.",
  },
  ad_ratio: {
    id: "ad_ratio",
    name: "Advance / Decline (A/D) Ratio",
    category: "Market Internals",
    provider: "NSE India Live Indices",
    defaultUrl: "https://www.nseindia.com/market-data/live-equity-market",
    calculation:
      "A/D Ratio = Total Advancing Stocks ÷ Total Declining Stocks. Values > 1.0 indicate positive breadth; < 1.0 indicate negative breadth.",
    laymanExplanation:
      "For every stock falling today, how many are rising? An A/D ratio of 2.0x means twice as many stocks are climbing as falling.",
    utility:
      "Confirms whether an index breakout is genuine. A high ratio confirms organic demand; a falling ratio during an index rally signals an imminent reversal.",
  },
  mcclellan: {
    id: "mcclellan",
    name: "McClellan Oscillator",
    category: "Market Internals",
    provider: "Computed on NSE Daily Net Advances",
    defaultUrl: "/markets/breadth",
    calculation:
      "McClellan Oscillator = 19-Day EMA of (Advances − Declines) − 39-Day EMA of (Advances − Declines).",
    laymanExplanation:
      "A momentum gauge for the whole market breadth, measuring how fast positive breadth is accelerating over the past month.",
    utility:
      "Crossings above zero signal breadth buy signals; deep negative territory (< -100) indicates oversold capitulation.",
  },
  dma20: {
    id: "dma20",
    name: "20-Day Simple Moving Average (20 DMA)",
    category: "Technical Analysis",
    provider: "Technical Engine on Daily Closes",
    defaultUrl: "/markets/momentum",
    calculation:
      "Average closing price of the security over the rolling past 20 trading sessions (~1 calendar month).",
    laymanExplanation:
      "The short-term trend benchmark. Shows where the stock price has averaged over the past month.",
    utility:
      "Used by swing traders as a primary short-term dynamic support and pull-back buy trigger in an uptrend.",
  },
  dma50: {
    id: "dma50",
    name: "50-Day Simple Moving Average (50 DMA)",
    category: "Technical Analysis",
    provider: "Technical Engine on Daily Closes",
    defaultUrl: "/markets/momentum",
    calculation:
      "Average closing price of the security over the rolling past 50 trading sessions (~1 fiscal quarter).",
    laymanExplanation:
      "The medium-term trend line watched closely by institutional mutual fund managers.",
    utility:
      "When a stock pulls back to its 50 DMA during a bull run, institutional algorithms frequently step in to defend the position.",
  },
  dma200: {
    id: "dma200",
    name: "200-Day Simple Moving Average (200 DMA)",
    category: "Technical Analysis",
    provider: "Technical Engine on Daily Closes",
    defaultUrl: "/markets/momentum",
    calculation:
      "Average closing price of the security over the rolling past 200 trading sessions (~1 calendar year).",
    laymanExplanation:
      "The grand structural dividing line between a long-term bull market and a bear market.",
    utility:
      "Stocks trading comfortably above their 200 DMA are in healthy long-term secular uptrends. Dropping below warns of protracted weakness.",
  },
  earnings_yield: {
    id: "earnings_yield",
    name: "Earnings Yield (E/P)",
    category: "Valuation Multiples",
    provider: "NSE India / Valuation Desk",
    defaultUrl: "/markets/valuation",
    calculation:
      "Earnings Yield % = (1 ÷ P/E Ratio) × 100 = Aggregate Net Profits (PAT) ÷ Total Market Capitalization.",
    laymanExplanation:
      "The percentage return generated by the underlying business earnings for every rupee of stock price.",
    utility:
      "Allows direct comparison between stock returns and bond yields. If NIFTY P/E is 21x, the Earnings Yield is 4.76%.",
  },
  market_cap_gdp: {
    id: "market_cap_gdp",
    name: "Buffett Indicator (Market Cap to GDP)",
    category: "Valuation Multiples",
    provider: "MOSPI & BSE Listed Equities Aggregate",
    defaultUrl: "/markets/valuation",
    calculation:
      "Buffett Indicator % = (Total Market Capitalization of all domestic listed companies ÷ Nominal Annual GDP) × 100.",
    laymanExplanation:
      "Warren Buffett's favorite metric: compares the valuation of the entire stock market against the total economic output of the nation.",
    utility:
      "Ratios below 80% indicate broad undervaluation; 80%-100% is fair value; above 115% signals overvaluation where future returns may be compressed.",
  },
  buffett_indicator: {
    id: "buffett_indicator",
    name: "Buffett Indicator (Market Cap to GDP)",
    category: "Valuation Multiples",
    provider: "MOSPI & BSE Listed Equities Aggregate",
    defaultUrl: "/markets/valuation",
    calculation:
      "Buffett Indicator % = (Total Market Capitalization of all domestic listed companies ÷ Nominal Annual GDP) × 100.",
    laymanExplanation:
      "Compares total stock market value to the size of India's annual economy.",
    utility:
      "Identifies macroeconomic equity bubbles or long-term accumulation zones.",
  },
  data_quality: {
    id: "data_quality",
    name: "Feed Integrity & Quality Score",
    category: "Market Internals",
    provider: "Antigravity Telemetry Engine",
    defaultUrl: "/data",
    calculation:
      "Quality Score = 100 × (Valid Packets Received ÷ Total Expected Packets) − (Schema Validation Errors × 2).",
    laymanExplanation:
      "A real-time health score showing whether live market data streams are 100% authentic, uninterrupted, and verified against official schemas.",
    utility:
      "Guarantees that no fake or corrupted quotes enter the valuation engine or trade execution pipelines.",
  },
  feed_latency: {
    id: "feed_latency",
    name: "Live Feed Network Latency",
    category: "Market Internals",
    provider: "Antigravity Edge Gateways",
    defaultUrl: "/data",
    calculation:
      "Round-trip latency (ms) measured between edge ingest workers and the upstream exchange / data provider socket endpoint.",
    laymanExplanation:
      "The time in milliseconds it takes for a price change at the exchange to reach your screen.",
    utility:
      "Crucial for high-frequency pricing and real-time portfolio risk recalculation.",
  },
  var_95: {
    id: "var_95",
    name: "Value at Risk (95% 1-Day VaR)",
    category: "Portfolio Risk",
    provider: "Antigravity Quantitative Risk Engine",
    defaultUrl: "/risk",
    calculation:
      "Parametric VaR = NAV × [Z_0.95 × σ_daily − μ_daily], where Z_0.95 = 1.645, based on rolling 252-day covariance matrix.",
    laymanExplanation:
      "The maximum money you are expected to lose in a single day under normal market conditions with 95% statistical certainty.",
    utility:
      "Institutional standard for capital adequacy and downside risk allocation.",
  },
  cvar: {
    id: "cvar",
    name: "Conditional VaR / Expected Shortfall (CVaR 95%)",
    category: "Portfolio Risk",
    provider: "Antigravity Quantitative Risk Engine",
    defaultUrl: "/risk",
    calculation:
      "CVaR = Expected value of loss given that the loss exceeds the 95% VaR cutoff: E[Loss | Loss > VaR_0.95].",
    laymanExplanation:
      "Answers the question: 'If today turns out to be one of the worst 5% disaster days, on average how much money will we actually lose?'",
    utility:
      "Captures extreme tail risk and catastrophic black-swan events that standard VaR ignores.",
  },
  sortino: {
    id: "sortino",
    name: "Sortino Ratio",
    category: "Portfolio Performance",
    provider: "Antigravity Quantitative Engine",
    defaultUrl: "/quant",
    calculation:
      "Sortino Ratio = (Portfolio Return − Risk-Free Rate) ÷ Downside Deviation (Semi-standard deviation of negative returns only).",
    laymanExplanation:
      "Like the Sharpe ratio, but it doesn't penalize upside volatility (surges). It only punishes painful downward drops.",
    utility:
      "Favored by growth investors because volatile upside spikes are good, not bad.",
  },
  treynor: {
    id: "treynor",
    name: "Treynor Ratio",
    category: "Portfolio Performance",
    provider: "Antigravity Quantitative Engine",
    defaultUrl: "/quant",
    calculation:
      "Treynor Ratio = (Portfolio Return − Risk-Free Rate) ÷ Portfolio Beta.",
    laymanExplanation:
      "How much excess return the portfolio delivered for each unit of systemic market risk taken.",
    utility:
      "Ideal for evaluating well-diversified portfolios where unsystematic company-specific risk has been eliminated.",
  },
  tracking_error: {
    id: "tracking_error",
    name: "Tracking Error",
    category: "Portfolio Risk",
    provider: "Antigravity Quantitative Engine",
    defaultUrl: "/attribution",
    calculation:
      "Tracking Error = Annualized standard deviation of the difference between portfolio returns and benchmark returns: σ(R_p − R_b) × √252.",
    laymanExplanation:
      "How closely the portfolio hugs or deviates from its benchmark index over time.",
    utility:
      "Index funds aim for tracking error near 0; active high-conviction managers exhibit higher tracking error seeking high alpha.",
  },
  information_ratio: {
    id: "information_ratio",
    name: "Information Ratio",
    category: "Portfolio Performance",
    provider: "Antigravity Institutional Analytics",
    defaultUrl: "/attribution",
    calculation:
      "Information Ratio = Active Return (Portfolio Return − Benchmark Return) ÷ Tracking Error.",
    laymanExplanation:
      "Measures the consistency and efficiency of a fund manager's ability to beat the benchmark relative to the risk taken.",
    utility:
      "An IR > 0.5 indicates consistent, reliable active stock-picking outperformance.",
  },
  vwap: {
    id: "vwap",
    name: "Volume Weighted Average Price (VWAP)",
    category: "Technical Analysis",
    provider: "NSE Tick Data Engine",
    defaultUrl: "/markets/momentum",
    calculation:
      "VWAP = Σ (Price_i × Volume_i) ÷ Σ Volume_i for all intraday transactions since market open.",
    laymanExplanation:
      "The true average price paid for all shares traded today, weighted by how many shares changed hands at each price level.",
    utility:
      "Institutional trading desks use VWAP to evaluate trade execution quality; buying below VWAP means getting a bargain compared to the day's average participant.",
  },
  ipo_gmp: {
    id: "ipo_gmp",
    name: "IPO Grey Market Premium (GMP)",
    category: "Corporate Disclosures",
    provider: "Unofficial Inter-dealer OTC Desk / Exchange Surveillance",
    defaultUrl: "/ipo",
    calculation:
      "GMP = Unofficial OTC forward price quoted before stock listing − Official IPO issue price. Expected listing gain % = (GMP ÷ Issue Price) × 100.",
    laymanExplanation:
      "The informal price premium people are willing to pay for IPO shares before the company is officially listed on NSE/BSE.",
    utility:
      "Leading barometer of retail and HNI listing-day hype and expected opening pop.",
  },
  ipo_subscription: {
    id: "ipo_subscription",
    name: "IPO Subscription Bidding Multiple",
    category: "Corporate Disclosures",
    provider: "NSE / BSE Official Bidding Platforms",
    defaultUrl: "/ipo",
    calculation:
      "Subscription Multiple = Total Number of Shares Applied For ÷ Total Number of Shares Offered in the Tranche (QIB, NII/HNI, Retail).",
    laymanExplanation:
      "How many times oversubscribed the IPO is. A 50x subscription means 50 applications were received for every 1 share available.",
    utility:
      "Institutional (QIB) subscription > 30x confirms strong smart-money backing and institutional appetite.",
  },
};

export function getMetric(id: string): MetricDefinition {
  const normalized = id.toLowerCase().replace(/[^a-z0-9_]/g, "");
  return (
    METRICS_CATALOG[normalized] ??
    METRICS_CATALOG[id] ?? {
      id,
      name: id.toUpperCase(),
      category: "Market Internals",
      provider: "Official Exchange / Regulatory Feed",
      defaultUrl: "https://www.nseindia.com",
      calculation: "Official regulatory calculation defined by relevant exchange authorities.",
      laymanExplanation: "Real-time market metric pulled from official data streams.",
      utility: "Used for institutional investment analysis and market surveillance.",
    }
  );
}
