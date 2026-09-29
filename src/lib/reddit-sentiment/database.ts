import {
  TrackedSubredditMeta,
  CompanyRetailSentiment,
  RetailInvestorProblemInsight,
  RetailSentimentHubData,
} from "./types";

export const TRACKED_SUBREDDITS: TrackedSubredditMeta[] = [
  {
    id: "r/IndiaInvestments",
    name: "India Investments",
    memberCount: "850K+",
    focusArea: "Fundamental equity research, debt instruments, mutual funds, personal finance",
    geoFocus: "India",
    url: "https://www.reddit.com/r/IndiaInvestments/",
  },
  {
    id: "r/IndianStreetBets",
    name: "Indian Street Bets",
    memberCount: "680K+",
    focusArea: "Options trading, momentum swings, F&O expiry plays, retail sentiment memes",
    geoFocus: "India",
    url: "https://www.reddit.com/r/IndianStreetBets/",
  },
  {
    id: "r/IndianStockMarket",
    name: "Indian Stock Market",
    memberCount: "540K+",
    focusArea: "Mid/small-cap breakouts, portfolio reviews, retail investor questions",
    geoFocus: "India",
    url: "https://www.reddit.com/r/IndianStockMarket/",
  },
  {
    id: "r/IndiaStocks",
    name: "India Stocks",
    memberCount: "220K+",
    focusArea: "Long-term stock picks, quarterly earnings discussions, sectoral analysis",
    geoFocus: "India",
    url: "https://www.reddit.com/r/IndiaStocks/",
  },
  {
    id: "r/personalfinanceindia",
    name: "Personal Finance India",
    memberCount: "380K+",
    focusArea: "Capital gains tax (LTCG/STCG), tax harvesting, broker grievances, EPF/PPF",
    geoFocus: "India",
    url: "https://www.reddit.com/r/personalfinanceindia/",
  },
  {
    id: "r/ValueInvesting",
    name: "Value Investing",
    memberCount: "450K+",
    focusArea: "DCF modeling, economic moats, margin of safety, distressed turnarounds",
    geoFocus: "Global",
    url: "https://www.reddit.com/r/ValueInvesting/",
  },
  {
    id: "r/investing",
    name: "Investing",
    memberCount: "2.4M+",
    focusArea: "Global macro, monetary policy, institutional allocations, asset classes",
    geoFocus: "Global",
    url: "https://www.reddit.com/r/investing/",
  },
  {
    id: "r/stocks",
    name: "Stocks",
    memberCount: "5.8M+",
    focusArea: "Earnings reactions, tech valuations, market sentiment shifts",
    geoFocus: "Global",
    url: "https://www.reddit.com/r/stocks/",
  },
  {
    id: "r/options",
    name: "Options",
    memberCount: "1.8M+",
    focusArea: "Volatility smile, implied volatility crush, delta-neutral hedging",
    geoFocus: "Global",
    url: "https://www.reddit.com/r/options/",
  },
  {
    id: "r/algotrading",
    name: "Algo Trading",
    memberCount: "1.1M+",
    focusArea: "Quantitative models, strategy backtesting, execution latency, APIs",
    geoFocus: "Global",
    url: "https://www.reddit.com/r/algotrading/",
  },
];

export const COMPANY_RETAIL_SENTIMENT_DATA: Record<string, CompanyRetailSentiment> = {
  RELIANCE: {
    symbol: "RELIANCE",
    companyName: "Reliance Industries",
    sector: "Conglomerate (Telecom / Retail / O2C)",
    totalMentions7D: 1840,
    mentionChangePct7D: 142, // Mentions: +142%
    positivePct: 61,        // Positive: 61%
    negativePct: 24,        // Negative: 24%
    neutralPct: 15,         // Neutral: 15%
    netSentimentScore: 37,  // 61 - 24 = +37
    sentimentMomentum: "ACCELERATING_BULLISH", // ↑
    mostDiscussedTopics: ["Jio", "O2C", "Retail", "Valuation", "AGM"],
    communityDistribution: [
      { subreddit: "r/IndianStreetBets", percentage: 42, postCount: 772 },
      { subreddit: "r/IndianStockMarket", percentage: 28, postCount: 515 },
      { subreddit: "r/IndiaInvestments", percentage: 18, postCount: 331 },
      { subreddit: "r/IndiaStocks", percentage: 8, postCount: 147 },
      { subreddit: "r/ValueInvesting", percentage: 4, postCount: 75 },
    ],
    topRetailDebates: [
      {
        topic: "Jio Tariff Hike Flow-Through to ARPU",
        bullThesis: "15-20% tariff hikes are flowing straight to EBITDA with virtually zero subscriber churn. Jio is transforming into a high-margin cash cow.",
        bearThesis: "Jio subscriber additions have slowed down in rural circles; 5G monetization still lacks distinct pricing tiers.",
        consensusVerdict: "Bullish consensus. Retail expects ARPU to cross ₹200 within 2 quarters, unlocking high IPO valuations.",
        sampleCommentSnippet: "Everyone was crying about tariff hikes for 2 days and then bought the recharge anyway. Jio has an unbreakable monopoly moat.",
        subreddit: "r/IndianStreetBets",
      },
      {
        topic: "O2C Downstream Margins vs New Energy Capex",
        bullThesis: "Jamnagar complexity allows processing discounted Russian crude barrels, buffering volatile global crack spreads.",
        bearThesis: "New Energy solar & hydrogen giga-complexes have long gestation periods and will consume huge operational cash flow.",
        consensusVerdict: "Mixed. Retail loves the green energy vision but questions short-term RoCE dilution.",
        sampleCommentSnippet: "Wait for the AGM announcement on Jio or Retail IPO timeline; that's the only real trigger to break out of this consolidation band.",
        subreddit: "r/IndiaInvestments",
      },
    ],
    sentimentHistory30D: [
      { date: "2026-09-02", positive: 48, negative: 32, neutral: 20, mentions: 180 },
      { date: "2026-09-09", positive: 52, negative: 28, neutral: 20, mentions: 220 },
      { date: "2026-09-16", positive: 55, negative: 26, neutral: 19, mentions: 340 },
      { date: "2026-09-23", positive: 59, negative: 25, neutral: 16, mentions: 520 },
      { date: "2026-09-30", positive: 61, negative: 24, neutral: 15, mentions: 580 },
    ],
  },

  TATAMOTORS: {
    symbol: "TATAMOTORS",
    companyName: "Tata Motors Limited",
    sector: "Automotive & Electric Mobility",
    totalMentions7D: 2120,
    mentionChangePct7D: 98,
    positivePct: 68,
    negativePct: 18,
    neutralPct: 14,
    netSentimentScore: 50,
    sentimentMomentum: "ACCELERATING_BULLISH", // ↑
    mostDiscussedTopics: ["Demerger", "JLR Net Cash", "Curvv EV", "Dealer Inventory", "CRISIL AAA"],
    communityDistribution: [
      { subreddit: "r/IndianStreetBets", percentage: 38, postCount: 805 },
      { subreddit: "r/IndiaInvestments", percentage: 32, postCount: 678 },
      { subreddit: "r/IndianStockMarket", percentage: 22, postCount: 466 },
      { subreddit: "r/stocks", percentage: 8, postCount: 171 },
    ],
    topRetailDebates: [
      {
        topic: "Demerger Value Unlocking (CV vs PV)",
        bullThesis: "Mirror 1:1 demerger allows institutional investors to value JLR + PV at a premium luxury EV multiple while CV trades as an infrastructure play.",
        bearThesis: "Two standalone entities mean CV can no longer borrow JLR cash flows during heavy truck downcycles.",
        consensusVerdict: "Overwhelmingly bullish. Retail investors intend to hold both entities post-listing.",
        sampleCommentSnippet: "Getting 1 share of passenger/JLR and 1 share of CV for free without tax leakage is the cleanest corporate restructuring in Indian markets.",
        subreddit: "r/IndiaInvestments",
      },
    ],
    sentimentHistory30D: [
      { date: "2026-09-02", positive: 60, negative: 22, neutral: 18, mentions: 280 },
      { date: "2026-09-09", positive: 62, negative: 21, neutral: 17, mentions: 390 },
      { date: "2026-09-16", positive: 65, negative: 20, neutral: 15, mentions: 610 },
      { date: "2026-09-23", positive: 67, negative: 19, neutral: 14, mentions: 780 },
      { date: "2026-09-30", positive: 68, negative: 18, neutral: 14, mentions: 860 },
    ],
  },

  SUZLON: {
    symbol: "SUZLON",
    companyName: "Suzlon Energy",
    sector: "Renewable Energy & Wind Turbines",
    totalMentions7D: 2840,
    mentionChangePct7D: 215,
    positivePct: 72,
    negativePct: 16,
    neutralPct: 12,
    netSentimentScore: 56,
    sentimentMomentum: "ACCELERATING_BULLISH", // ↑
    mostDiscussedTopics: ["NTPC Order", "Order Book 4.2GW", "Turnaround", "Net Cash", "CARE Upgrade"],
    communityDistribution: [
      { subreddit: "r/IndianStreetBets", percentage: 55, postCount: 1562 },
      { subreddit: "r/IndianStockMarket", percentage: 30, postCount: 852 },
      { subreddit: "r/IndiaStocks", percentage: 15, postCount: 426 },
    ],
    topRetailDebates: [
      {
        topic: "Multibagger Rally vs Execution Capacity",
        bullThesis: "Net cash of ₹1,480 Cr, zero debt, and 4.2 GW order book from central PSUs make this a legitimate industrial turnaround.",
        bearThesis: "Retail FOMO is extreme; any quarterly dispatch delay due to transmission bottleneck will cause a sharp sentiment correction.",
        consensusVerdict: "Euphoric retail momentum. Community treats Suzlon as the poster child of India's green capex.",
        sampleCommentSnippet: "Remember when people called Suzlon a penny stock trap at ₹8? Now NTPC is giving them 1.1 GW single contracts and rating agencies are upgrading to A-.",
        subreddit: "r/IndianStreetBets",
      },
    ],
    sentimentHistory30D: [
      { date: "2026-09-02", positive: 62, negative: 24, neutral: 14, mentions: 340 },
      { date: "2026-09-09", positive: 66, negative: 20, neutral: 14, mentions: 520 },
      { date: "2026-09-16", positive: 69, negative: 18, neutral: 13, mentions: 890 },
      { date: "2026-09-23", positive: 71, negative: 17, neutral: 12, mentions: 1200 },
      { date: "2026-09-30", positive: 72, negative: 16, neutral: 12, mentions: 1350 },
    ],
  },

  ZOMATO: {
    symbol: "ZOMATO",
    companyName: "Zomato Limited (Blinkit)",
    sector: "Quick Commerce & Consumer Tech",
    totalMentions7D: 2490,
    mentionChangePct7D: 185,
    positivePct: 74,
    negativePct: 18,
    neutralPct: 8,
    netSentimentScore: 56,
    sentimentMomentum: "ACCELERATING_BULLISH", // ↑
    mostDiscussedTopics: ["Blinkit GOV", "Dark Store Expansion", "Zepto Competition", "EBITDA Break-even", "Platform Fee"],
    communityDistribution: [
      { subreddit: "r/IndianStreetBets", percentage: 44, postCount: 1095 },
      { subreddit: "r/IndianStockMarket", percentage: 32, postCount: 796 },
      { subreddit: "r/IndiaInvestments", percentage: 16, postCount: 398 },
      { subreddit: "r/stocks", percentage: 8, postCount: 201 },
    ],
    topRetailDebates: [
      {
        topic: "Blinkit Quick Commerce Monopoly vs Deep Pocket Retailers",
        bullThesis: "Blinkit's 10-minute delivery is habit-forming; average order values (AOV) are expanding into electronics, beauty, and festive gifts.",
        bearThesis: "Reliance JioMart and Tata Neu could initiate predatory price wars; dark store rentals are spiking in metro clusters.",
        consensusVerdict: "Strongly bullish. Retail believes Blinkit has established decisive network effects in top 8 cities.",
        sampleCommentSnippet: "Blinkit is no longer a grocery app. I just bought an iPhone and noise-canceling headphones in 9 minutes. The operating leverage will be insane.",
        subreddit: "r/IndianStreetBets",
      },
    ],
    sentimentHistory30D: [
      { date: "2026-09-02", positive: 64, negative: 25, neutral: 11, mentions: 450 },
      { date: "2026-09-09", positive: 68, negative: 22, neutral: 10, mentions: 680 },
      { date: "2026-09-16", positive: 70, negative: 21, neutral: 9, mentions: 920 },
      { date: "2026-09-23", positive: 73, negative: 19, neutral: 8, mentions: 1350 },
      { date: "2026-09-30", positive: 74, negative: 18, neutral: 8, mentions: 1540 },
    ],
  },

  HDFCBANK: {
    symbol: "HDFCBANK",
    companyName: "HDFC Bank",
    sector: "Private Banking & Financials",
    totalMentions7D: 1650,
    mentionChangePct7D: 64,
    positivePct: 48,
    negativePct: 32,
    neutralPct: 20,
    netSentimentScore: 16,
    sentimentMomentum: "NEUTRAL", // →
    mostDiscussedTopics: ["LDR Ratio", "Deposit Mobilization", "NIM Compression", "FII Outflows", "Underperformance"],
    communityDistribution: [
      { subreddit: "r/IndiaInvestments", percentage: 46, postCount: 759 },
      { subreddit: "r/IndianStockMarket", percentage: 34, postCount: 561 },
      { subreddit: "r/IndianStreetBets", percentage: 20, postCount: 330 },
    ],
    topRetailDebates: [
      {
        topic: "Credit-to-Deposit (LDR) Normalization vs Slow Earnings Growth",
        bullThesis: "HDFC Bank is the safest private lender in India trading at its lowest historical 10-year P/B valuation; once LDR drops below 85%, loan growth reaccelerates.",
        bearThesis: "Deposit competition is brutal; PSUs are offering higher FD rates, keeping cost of funds elevated for another 3-4 quarters.",
        consensusVerdict: "Exhausted patience. Retail investors are divided between long-term value accumulation and frustration over multi-year dead capital.",
        sampleCommentSnippet: "Every mutual fund manager calls HDFC Bank a no-brainer compounding machine, but Nifty makes new highs while HDFC Bank behaves like a bond.",
        subreddit: "r/IndiaInvestments",
      },
    ],
    sentimentHistory30D: [
      { date: "2026-09-02", positive: 45, negative: 36, neutral: 19, mentions: 320 },
      { date: "2026-09-09", positive: 46, negative: 34, neutral: 20, mentions: 380 },
      { date: "2026-09-16", positive: 47, negative: 33, neutral: 20, mentions: 420 },
      { date: "2026-09-23", positive: 48, negative: 32, neutral: 20, mentions: 510 },
      { date: "2026-09-30", positive: 48, negative: 32, neutral: 20, mentions: 520 },
    ],
  },
};

/**
 * Investor Problems & Unmet Needs surfaced directly from Reddit communities
 * that conventional financial datasets (Bloomberg, Reuters, Screener) overlook.
 */
export const RETAIL_INVESTOR_PROBLEMS: RetailInvestorProblemInsight[] = [
  {
    id: "prob-concall-transcripts",
    category: "RESEARCH",
    categoryLabel: "Research & Management Veracity",
    headline: "Retail cannot access verbatim concall transcripts or track management guidance veracity",
    problemDescription:
      "Retail investors repeatedly express frustration that traditional screeners only show 3-line summaries of quarterly earnings, hiding what the CEO actually said under analyst pressure. There is no automated tracking of whether management met or broke their capex and margin promises.",
    monthlyMentionGrowthPct: 84,
    sampleCommunityQueries: [
      {
        subreddit: "r/IndiaInvestments",
        queryTitle: "Where do you guys get actual full concall transcripts without paying ₹50,000 to Trendlyne/Bloomberg?",
        quoteExcerpt:
          "The broker summaries are useless because they smooth over the hard questions. During the Q4 call, an analyst asked why receivables jumped 40%, and the CFO gave an evasive answer that the broker research report completely omitted.",
        upvotes: 412,
        commentsCount: 96,
        timestamp: "3 days ago",
      },
      {
        subreddit: "r/ValueInvesting",
        queryTitle: "How do you systematically track if a company management actually keeps their promises?",
        quoteExcerpt:
          "Every quarter they promise margin expansion next year. 2 quarters later they blame freight costs. Is there a tracker that maps management tone and guidance shifts quarter-over-quarter?",
        upvotes: 680,
        commentsCount: 142,
        timestamp: "1 week ago",
      },
    ],
    conventionalDatasetBlindspot:
      "Conventional datasets treat earnings as purely quantitative time series (EPS, Revenue, EBITDA) and ignore the linguistic tone inflection and guidance delta in audio calls.",
    miSolutionFeature: {
      featureTitle: "Concall Intelligence & Management Tone Tracker",
      href: "/intelligence/company",
      howItSolves:
        "Full IR crawler that extracts management confidence scores, 11 operational guidance dimensions, verbatim analyst Q&A, and longitudinal multi-quarter tone trajectories.",
    },
  },

  {
    id: "prob-portfolio-fragmentation",
    category: "PORTFOLIO_TRACKING",
    categoryLabel: "Portfolio Tracking & Fragmentation",
    headline: "Multi-broker fragmentation, manual statement entry, and privacy-invasive tracker apps",
    problemDescription:
      "Indian retail investors frequently operate across multiple demat accounts (e.g. Zerodha for direct stocks, Groww for mutual funds, Dhan for F&O). Existing aggregator tools either demand raw broker login credentials, sell order flow data, or fail when parsing standard NSDL/CDSL CAS PDFs.",
    monthlyMentionGrowthPct: 112,
    sampleCommunityQueries: [
      {
        subreddit: "r/personalfinanceindia",
        queryTitle: "Any portfolio tracker that doesn't ask for my Zerodha password or sell my data?",
        quoteExcerpt:
          "I refuse to give read-write access to third-party apps. I just want to drop my consolidated NSDL e-CAS or broker Excel statement and have it compute my real XIRR and factor risk without leaking my net worth to fintech marketers.",
        upvotes: 890,
        commentsCount: 230,
        timestamp: "5 days ago",
      },
      {
        subreddit: "r/IndianStreetBets",
        queryTitle: "Why does every portfolio app choke on bonus shares and stock split adjustments?",
        quoteExcerpt:
          "Imported my statement after the Tata Motors and Jio Financial demerger; my cost basis is completely warped and showing a fake 80% loss. Manual Excel maintenance is becoming a full-time job.",
        upvotes: 540,
        commentsCount: 88,
        timestamp: "2 weeks ago",
      },
    ],
    conventionalDatasetBlindspot:
      "Broker terminals intentionally build walled gardens to prevent clients from seeing their unified multi-broker asset allocation or recognizing fee bleed.",
    miSolutionFeature: {
      featureTitle: "Universal Statement Parser & Portfolio Workbench",
      href: "/portfolio",
      howItSolves:
        "Local, privacy-preserving universal statement parser supporting PDF/Excel/CSV drag-and-drop from all major Indian brokers with automated corporate action reconciliation.",
    },
  },

  {
    id: "prob-budget-taxes",
    category: "TAXES",
    categoryLabel: "Taxes & Capital Gains Regulations",
    headline: "Massive confusion surrounding Budget 2024 LTCG (12.5%) vs STCG (20%) and tax harvesting rules",
    problemDescription:
      "The July 2024 Union Budget tax overhaul created immense complexity for retail investors: revision of LTCG tax rate to 12.5%, STCG to 20%, grandfathering cutoffs, ₹1.25 Lakh exemption distribution, and F&O business turnover audit thresholds.",
    monthlyMentionGrowthPct: 145,
    sampleCommunityQueries: [
      {
        subreddit: "r/personalfinanceindia",
        queryTitle: "How to calculate tax on equity bought before July 23, 2024? CA is charging ₹5k just for this.",
        quoteExcerpt:
          "My broker's tax P&L report is still computing taxes under the old slab. If I sell shares bought in April 2024 today, do I get the old 10% rate or the new 12.5% rate? How do I harvest the ₹1.25L exemption before March 31 without triggering wash sale scrutiny?",
        upvotes: 1120,
        commentsCount: 310,
        timestamp: "4 days ago",
      },
      {
        subreddit: "r/IndianStreetBets",
        queryTitle: "F&O turnover calculation for ITR-3: Absolute profit/loss method vs New SEBI guidelines?",
        quoteExcerpt:
          "Lost money trading Nifty weekly expiry options. Do I need a mandatory tax audit under 44AB? Every YouTuber says something different and Cleartax wants ₹8,000 for business ITR filing.",
        upvotes: 740,
        commentsCount: 165,
        timestamp: "1 week ago",
      },
    ],
    conventionalDatasetBlindspot:
      "Global terminal providers (Bloomberg, Koyfin, TradingView) have zero integration with India's Finance Act provisions, Section 112A, or CBDT tax harvesting rules.",
    miSolutionFeature: {
      featureTitle: "India Tax Engine & Capital Gains Estimator",
      href: "/portfolio/tax",
      howItSolves:
        "Interactive tax modeling applying post-Budget 2024 rules (12.5% LTCG, 20% STCG, ₹1.25L exemption threshold) with automated tax-loss harvesting recommendations.",
    },
  },

  {
    id: "prob-debt-pledge-blindspots",
    category: "FINDING_INFO",
    categoryLabel: "Information Discovery & Early Warnings",
    headline: "Hidden credit rating actions, debt distress, and stealth promoter pledge increases",
    problemDescription:
      "Retail equity investors consistently get blindsided when a mid-cap or large-cap crashes 8-10% intraday, only to discover that rating agencies (CRISIL, ICRA, CARE) issued a negative credit watch or debt downgrade 48 hours earlier on a separate PDF portal.",
    monthlyMentionGrowthPct: 92,
    sampleCommunityQueries: [
      {
        subreddit: "r/IndianStockMarket",
        queryTitle: "Why don't stock apps show credit rating changes alongside stock charts?",
        quoteExcerpt:
          "SPARC fell off a cliff today. I searched everywhere on moneycontrol and found nothing. Then someone on Twitter posted a screenshot of an ICRA downgrade note from yesterday. Why is credit debt risk kept completely separate from retail stock quotes?",
        upvotes: 620,
        commentsCount: 114,
        timestamp: "6 days ago",
      },
      {
        subreddit: "r/IndianStreetBets",
        queryTitle: "Promoter pledge increased by 14% last week and BSE filing was buried under disclosures",
        quoteExcerpt:
          "Retail was buying the dip while the promoters were quietly pledging shares to private lenders. By the time it was discussed on Reddit, the stock was already down 15%. We need an early warning radar for promoter insider moves.",
        upvotes: 830,
        commentsCount: 156,
        timestamp: "2 weeks ago",
      },
    ],
    conventionalDatasetBlindspot:
      "Financial news focuses almost exclusively on earnings announcements and price charts, treating credit rating rationales and SEBI SAST pledge filings as specialized debt-desk disclosures.",
    miSolutionFeature: {
      featureTitle: "Credit & Solvency Radar + Promoter Activity Tracker",
      href: "/intelligence/credit",
      howItSolves:
        "Real-time surveillance across CRISIL, ICRA, CARE, India Ratings, Acuité, and Brickwork, directly connecting debt rating migration and promoter pledge spikes to equity valuation impact.",
    },
  },
];

/**
 * Algorithmic generator for any ticker so user entering any symbol gets a realistic retail sentiment pulse.
 */
export function generateSyntheticRetailSentiment(symbol: string): CompanyRetailSentiment {
  const s = symbol.toUpperCase().trim();
  const hash = s.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const pos = 45 + (hash % 30); // 45 to 74%
  const neg = 15 + ((hash * 3) % 20); // 15 to 34%
  const neu = 100 - pos - neg;
  const net = pos - neg;
  const mentions = 600 + (hash * 17) % 1800;
  const mentionChg = 20 + (hash % 150);

  const momentum: CompanyRetailSentiment["sentimentMomentum"] =
    net > 30 ? "ACCELERATING_BULLISH" : net > 10 ? "MILD_BULLISH" : net > -10 ? "NEUTRAL" : "SOFTENING_BEARISH";

  return {
    symbol: s,
    companyName: `${s} Listed Equity`,
    sector: "Indian Capital Markets",
    totalMentions7D: mentions,
    mentionChangePct7D: mentionChg,
    positivePct: pos,
    negativePct: neg,
    neutralPct: neu,
    netSentimentScore: net,
    sentimentMomentum: momentum,
    mostDiscussedTopics: ["Quarterly Earnings", "Valuation", "Breakout Chart", "FII Inflows", "Target Price"],
    communityDistribution: [
      { subreddit: "r/IndianStreetBets", percentage: 45, postCount: Math.round(mentions * 0.45) },
      { subreddit: "r/IndianStockMarket", percentage: 30, postCount: Math.round(mentions * 0.30) },
      { subreddit: "r/IndiaInvestments", percentage: 15, postCount: Math.round(mentions * 0.15) },
      { subreddit: "r/IndiaStocks", percentage: 10, postCount: Math.round(mentions * 0.10) },
    ],
    topRetailDebates: [
      {
        topic: "Momentum Breakout vs Fundamental Valuation",
        bullThesis: `Strong technical setup with surging volumes across ${s} on NSE; retail momentum expecting new 52-week highs.`,
        bearThesis: `Valuation multiples are elevated relative to historical median; risk of profit-taking if broader market consolidates.`,
        consensusVerdict: "Cautiously optimistic retail outlook with close stop-losses maintained.",
        sampleCommentSnippet: `Volume expansion on ${s} has been steady all week. If it breaks resistance, institutional FOMO will kick in.`,
        subreddit: "r/IndianStreetBets",
      },
    ],
    sentimentHistory30D: [
      { date: "2026-09-02", positive: pos - 6, negative: neg + 4, neutral: neu + 2, mentions: Math.round(mentions * 0.6) },
      { date: "2026-09-09", positive: pos - 3, negative: neg + 2, neutral: neu + 1, mentions: Math.round(mentions * 0.75) },
      { date: "2026-09-16", positive: pos - 1, negative: neg + 1, neutral: neu, mentions: Math.round(mentions * 0.85) },
      { date: "2026-09-23", positive: pos, negative: neg, neutral: neu, mentions: Math.round(mentions * 0.95) },
      { date: "2026-09-30", positive: pos, negative: neg, neutral: neu, mentions },
    ],
  };
}

export function getCompanyRetailSentiment(symbol: string): CompanyRetailSentiment {
  const s = symbol.toUpperCase().trim();
  if (COMPANY_RETAIL_SENTIMENT_DATA[s]) {
    return COMPANY_RETAIL_SENTIMENT_DATA[s];
  }
  return generateSyntheticRetailSentiment(s);
}

export function getAllRetailSentimentData(): RetailSentimentHubData {
  const companies = Object.values(COMPANY_RETAIL_SENTIMENT_DATA);
  return {
    companies,
    trackedSubreddits: TRACKED_SUBREDDITS,
    overallMarketSentiment: {
      fiiDiiVsRetailDivergence: "FIIs are selective net sellers in large-cap banking while retail sentiment is heavily concentrated in high-beta green energy, quick commerce, and EV demerger plays.",
      retailEuphoriaScore: 68,
      mostHypedTickers: ["SUZLON", "ZOMATO", "TATAMOTORS", "RELIANCE"],
      mostHatedTickers: ["PAYTM", "HDFCBANK", "INDUSINDBK"],
      asOf: "Late September 2026 Alternative Data Stream",
    },
    investorProblems: RETAIL_INVESTOR_PROBLEMS,
  };
}
