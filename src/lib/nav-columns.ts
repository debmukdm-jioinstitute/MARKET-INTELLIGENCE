export type NavLink = {
  label: string;
  href: string;
  desc: string;
  badge?: "AI" | "NEW";
  external?: boolean;
};
export type NavColumn = { title: string; items: NavLink[] };

export const NAV_COLUMNS: NavColumn[] = [
  {
    title: "Markets",
    items: [
      { label: "Overview", href: "/markets", desc: "Cross-asset tape: equities, rates, and FX in one board." },
      { label: "India Cockpit", href: "/markets/india", desc: "NSE / BSE headline pulse and index depth." },
      { label: "Sector Comparables", href: "/markets/sectors", desc: "Rotation and relative strength by sector." },
      { label: "Valuation", href: "/markets/valuation", desc: "P/E, P/B, and yield bands versus history." },
      { label: "Breadth & Momentum", href: "/markets/breadth", desc: "Advance/decline and participation signals." },
      { label: "Derivatives", href: "/markets/derivatives", desc: "F&O open interest and positioning." },
    ],
  },
  {
    title: "Macro",
    items: [
      { label: "Global Board", href: "/macro", desc: "Regime-first read across growth, inflation, liquidity." },
      { label: "India Macro", href: "/macro/india", desc: "MOSPI, RBI, and fiscal data on one page." },
      { label: "Stress Index", href: "/macro/stress", desc: "India macro stress score and cross-signal convergence alerts." },
      { label: "Transmission Map", href: "/macro/transmission", desc: "Measured sector sensitivity to oil, INR, US yields and the S&P.", badge: "NEW" },
      { label: "Scenarios", href: "/macro/scenarios", desc: "Shock oil, INR or yields and see sector and portfolio impact." },
      { label: "RBI & Liquidity", href: "/macro/rbi", desc: "Policy stance, repo path, and system liquidity." },
      { label: "Currency", href: "/macro/currency", desc: "DXY, USDINR, and cross-currency tape." },
      { label: "Commodities", href: "/macro/commodities", desc: "Crude, gold, and industrial metals." },
      { label: "Economic Calendar", href: "/macro/calendar", desc: "Upcoming prints that can move the book." },
    ],
  },
  {
    title: "Portfolio",
    items: [
      { label: "Command Center", href: "/portfolio", desc: "Mark-to-market NAV, P&L, and live positions." },
      { label: "Allocation", href: "/portfolio/allocation", desc: "Policy weights versus actual exposure." },
      { label: "Risk & VaR", href: "/portfolio/risk", desc: "Vol, drawdown, and 95% Value-at-Risk." },
      { label: "Attribution", href: "/portfolio/attribution", desc: "Brinson-Fachler sector and security effects." },
      { label: "Quant & Factors", href: "/portfolio/quant", desc: "Factor loadings and systematic betas." },
      { label: "Optimizer", href: "/portfolio/optimizer", desc: "Mean-variance and risk-parity rebalancing." },
    ],
  },
  {
    title: "Research",
    items: [
      { label: "Company Workbench", href: "/research", desc: "Snapshots, comparables, and simulated history." },
      { label: "AI Desk", href: "/research/ai-desk", desc: "Alpha discovery and AI-assisted trade ideas.", badge: "AI" },
      { label: "IPO Pipeline", href: "/research/ipo", desc: "Upcoming listings and subscription tracking." },
      { label: "Options Flow", href: "/research/options-flow", desc: "Unusual activity across the options tape.", badge: "AI" },
      { label: "Research Reports", href: "/research-reports", desc: "Model-driven notes across the coverage list." },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { label: "Intelligence Feed", href: "/intelligence", desc: "News impact scored for sentiment and relevance.", badge: "AI" },
      { label: "Daily Brief", href: "/intelligence/brief", desc: "Pre-market and post-close brief with cited sources.", badge: "AI" },
      { label: "Alerts & Scanner Bot", href: "/intelligence/alerts", desc: "PKScreener Telegram alerts, scheduled scans & on-demand bot.", badge: "NEW" },
      { label: "Backtesting", href: "/intelligence/backtesting", desc: "₹10K growth charts, morning-vs-close P&L, ATR paper trading.", badge: "NEW" },
      { label: "AI Signals", href: "/intelligence/ai-signals", desc: "Nifty next-day ML prediction, BTST/STBT signals & trend forecasts.", badge: "AI" },
      { label: "System & Data", href: "/data", desc: "Feed health, sources, and data freshness." },
      { label: "Data Health", href: "/data/health", desc: "Freshness and provenance of every collected series." },
      { label: "Data Feeds", href: "/data/feeds", desc: "Full list of connected market data providers." },
      {
        label: "External Brief (Bazaarbrief)",
        href: "https://abhisheksi2o.github.io/Bazaarbrief/",
        desc: "A short, external read on the day's market narrative.",
        external: true,
      },
    ],
  },
];
