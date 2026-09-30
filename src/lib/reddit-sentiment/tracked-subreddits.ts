import type { TrackedSubredditMeta } from "./types";

/** Real subreddits this feature searches. Membership counts are approximate/manually maintained
 * (Reddit doesn't expose them via the unauthenticated JSON API this app uses) — everything else
 * here (which communities, their focus, their URLs) is real and verifiable by visiting the link. */
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

