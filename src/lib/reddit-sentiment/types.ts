export type TrackedSubredditId =
  | "r/IndiaInvestments"
  | "r/IndianStreetBets"
  | "r/IndianStockMarket"
  | "r/IndiaStocks"
  | "r/personalfinanceindia"
  | "r/ValueInvesting"
  | "r/investing"
  | "r/stocks"
  | "r/options"
  | "r/algotrading";

export interface TrackedSubredditMeta {
  id: TrackedSubredditId;
  name: string;
  memberCount: string;
  focusArea: string;
  geoFocus: "India" | "Global";
  url: string;
}

export type SentimentMomentum =
  | "ACCELERATING_BULLISH"   // ↑
  | "MILD_BULLISH"           // ↗
  | "NEUTRAL"                // →
  | "SOFTENING_BEARISH"      // ↘
  | "BEARISH_CAPITULATION";  // ↓

export interface SubredditDistribution {
  subreddit: TrackedSubredditId;
  percentage: number;
  postCount: number;
}

export interface RetailDebateThesis {
  topic: string;
  bullThesis: string;
  bearThesis: string;
  consensusVerdict: string;
  sampleCommentSnippet: string;
  subreddit: TrackedSubredditId;
}

export interface CompanyRetailSentiment {
  symbol: string;
  companyName: string;
  sector: string;
  totalMentions7D: number;
  mentionChangePct7D: number; // e.g. +142%
  positivePct: number;        // e.g. 61%
  negativePct: number;        // e.g. 24%
  neutralPct: number;         // e.g. 15%
  netSentimentScore: number;  // -100 to +100
  sentimentMomentum: SentimentMomentum; // ↑, ↗, →, ↘, ↓
  mostDiscussedTopics: string[]; // e.g. ["Jio", "O2C", "Retail", "Valuation", "AGM"]
  communityDistribution: SubredditDistribution[];
  topRetailDebates: RetailDebateThesis[];
  sentimentHistory30D: {
    date: string;
    positive: number;
    negative: number;
    neutral: number;
    mentions: number;
  }[];
}

export type InvestorProblemCategory =
  | "RESEARCH"
  | "PORTFOLIO_TRACKING"
  | "TAXES"
  | "FINDING_INFO";

export interface CommunityQueryQuote {
  subreddit: TrackedSubredditId;
  queryTitle: string;
  quoteExcerpt: string;
  upvotes: number;
  commentsCount: number;
  timestamp: string;
}

export interface RetailInvestorProblemInsight {
  id: string;
  category: InvestorProblemCategory;
  categoryLabel: string;
  headline: string;
  problemDescription: string;
  monthlyMentionGrowthPct: number; // e.g. +85%
  sampleCommunityQueries: CommunityQueryQuote[];
  conventionalDatasetBlindspot: string; // Why traditional Bloomberg / Reuters screeners miss this
  miSolutionFeature: {
    featureTitle: string;
    href: string;
    howItSolves: string;
  };
}

export interface RetailSentimentHubData {
  companies: CompanyRetailSentiment[];
  trackedSubreddits: TrackedSubredditMeta[];
  overallMarketSentiment: {
    fiiDiiVsRetailDivergence: string;
    retailEuphoriaScore: number; // 0-100
    mostHypedTickers: string[];
    mostHatedTickers: string[];
    asOf: string;
  };
  investorProblems: RetailInvestorProblemInsight[];
}
