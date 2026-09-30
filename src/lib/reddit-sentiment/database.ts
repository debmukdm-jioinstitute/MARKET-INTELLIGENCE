import {
  CompanyRetailSentiment,
  RetailInvestorProblemInsight,
  RetailSentimentHubData,
} from "./types";
import { getNifty500CapTier } from "./nifty500-cap-tier";

import { TRACKED_SUBREDDITS } from "./tracked-subreddits";
export { TRACKED_SUBREDDITS };


export const RETAIL_INVESTOR_PROBLEMS: RetailInvestorProblemInsight[] = [
  {
    id: "prob-concall-transcripts",
    category: "RESEARCH",
    categoryLabel: "Research & Management Veracity",
    headline: "Retail cannot access verbatim concall transcripts or track management guidance veracity",
    problemDescription:
      "Retail investors repeatedly express frustration that traditional screeners only show 3-line summaries of quarterly earnings, hiding what the CEO actually said under analyst pressure. There is no automated tracking of whether management met or broke their capex and margin promises.",
    sampleCommunityQueries: [
      {
        subreddit: "r/IndiaInvestments",
        queryTitle: "Where do you guys get actual full concall transcripts without paying ₹50,000 to Trendlyne/Bloomberg?",
      },
      {
        subreddit: "r/ValueInvesting",
        queryTitle: "How do you systematically track if a company management actually keeps their promises?",
      },
    ],
    conventionalDatasetBlindspot:
      "Conventional datasets treat earnings as purely quantitative time series (EPS, Revenue, EBITDA) and ignore the linguistic tone inflection and guidance delta in audio calls.",
    miSolutionFeature: {
      featureTitle: "Concall Intelligence & Management Tone Tracker",
      href: "/intelligence/company",
      howItSolves:
        "Not available yet — no verified concall transcript feed is connected, so no concall summaries or tone scores are shown rather than estimated ones.",
    },
  },

  {
    id: "prob-portfolio-fragmentation",
    category: "PORTFOLIO_TRACKING",
    categoryLabel: "Portfolio Tracking & Fragmentation",
    headline: "Multi-broker fragmentation, manual statement entry, and privacy-invasive tracker apps",
    problemDescription:
      "Indian retail investors frequently operate across multiple demat accounts (e.g. Zerodha for direct stocks, Groww for mutual funds, Dhan for F&O). Existing aggregator tools either demand raw broker login credentials, sell order flow data, or fail when parsing standard NSDL/CDSL CAS PDFs.",
    sampleCommunityQueries: [
      {
        subreddit: "r/personalfinanceindia",
        queryTitle: "Any portfolio tracker that doesn't ask for my Zerodha password or sell my data?",
      },
      {
        subreddit: "r/IndianStreetBets",
        queryTitle: "Why does every portfolio app choke on bonus shares and stock split adjustments?",
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
    sampleCommunityQueries: [
      {
        subreddit: "r/personalfinanceindia",
        queryTitle: "How to calculate tax on equity bought before July 23, 2024? CA is charging ₹5k just for this.",
      },
      {
        subreddit: "r/IndianStreetBets",
        queryTitle: "F&O turnover calculation for ITR-3: Absolute profit/loss method vs New SEBI guidelines?",
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
    sampleCommunityQueries: [
      {
        subreddit: "r/IndianStockMarket",
        queryTitle: "Why don't stock apps show credit rating changes alongside stock charts?",
      },
      {
        subreddit: "r/IndianStreetBets",
        queryTitle: "Promoter pledge increased by 14% last week and BSE filing was buried under disclosures",
      },
    ],
    conventionalDatasetBlindspot:
      "Financial news focuses almost exclusively on earnings announcements and price charts, treating credit rating rationales and SEBI SAST pledge filings as specialized debt-desk disclosures.",
    miSolutionFeature: {
      featureTitle: "Credit & Solvency Radar + Promoter Activity Tracker",
      href: "/intelligence/credit",
      howItSolves:
        "Not available yet — no verified rating-agency or promoter-disclosure feed is connected, so no rating actions or promoter activity are shown rather than estimated ones.",
    },
  },
];

/**
 * Honest profile for equities with low or dormant organic social chatter.
 * Never invents fake quotes, fake debates, or fabricated mention counts.
 */
export function createHonestLowChatterProfile(
  symbol: string,
  companyName: string,
  sector: string,
): CompanyRetailSentiment {
  const s = symbol.toUpperCase().trim();
  const capTier = getNifty500CapTier(s);
  return {
    symbol: s,
    companyName: companyName || `${s} Listed Equity`,
    sector: sector || "Indian Capital Markets",
    marketCapTier: capTier,
    dataStatus: "LOW_CHATTER",
    statusNotice: `Minimal organic retail discussion detected on r/IndianStreetBets, r/IndiaInvestments, and r/IndianStockMarket over the past 30 days for ${companyName} (${s}). Retail social buzz disproportionately clusters around high-momentum mid/small caps, PSU infrastructure, and headline consumer internet plays. You can run direct live searches across Reddit or explore institutional broker research and credit ratings below.`,
    totalMentions7D: 0,
    mentionChangePct7D: 0,
    positivePct: 0,
    negativePct: 0,
    neutralPct: 0,
    netSentimentScore: 0,
    sentimentMomentum: "NEUTRAL",
    mostDiscussedTopics: [
      "Institutional Equity",
      "Low Retail Social Volume",
      "Fundamentals & Earnings Driven",
    ],
    communityDistribution: [],
    topRetailDebates: [],
    sentimentHistory30D: [],
  };
}

/**
 * Legacy generator kept for test backward compatibility.
 */
/**
 * Hub data served to production. Only the tracked-subreddit directory and the editorial
 * investor-problem writeups are served from this module. Per-company mention stats are
 * fetched LIVE via fetch-live.ts (api/reddit/sentiment) — never from a static fixture.
 * There is no static "market euphoria score" here.
 */
export function getAllRetailSentimentData(): RetailSentimentHubData {
  return {
    trackedSubreddits: TRACKED_SUBREDDITS,
    investorProblems: RETAIL_INVESTOR_PROBLEMS,
  };
}
