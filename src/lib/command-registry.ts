/** Static route registry for the command palette's "Pages" group and help view. */
export type PageCommand = {
  href: string;
  label: string;
  description: string;
};

export const PAGE_COMMANDS: PageCommand[] = [
  { href: "/Home", label: "Dashboard", description: "India desk overview & institutional cockpit" },
  { href: "/portfolio", label: "Portfolios", description: "Portfolio management" },
  { href: "/research", label: "Research & Broker Consensus", description: "Security workbench & 11 institutional broker reports" },
  { href: "/intelligence/promoters", label: "Promoter & Insider Activity", description: "Promoter buying, selling, pledges, and block deals" },
  { href: "/intelligence/credit", label: "Credit & Solvency Radar", description: "CRISIL, ICRA, CARE rating upgrades, downgrades & debt watch alerts" },
  { href: "/intelligence/company", label: "Company & Concall Intelligence", description: "Company disclosure timelines, concall tone, guidance and valuation sandbox" },
  { href: "/intelligence/reddit", label: "Reddit Retail Sentiment", description: "Retail Sentiment Engine across r/IndianStreetBets, r/IndiaInvestments" },
  { href: "/intelligence/scanner", label: "Technical Scanners", description: "Breakout scans, VCP setups, golden crosses, and moving averages" },
  { href: "/intelligence/ai-signals", label: "AI Signals", description: "Autonomous multi-agent trade recommendations and market lean" },
  { href: "/intelligence/legal-risk", label: "Legal & Insolvency Risk", description: "NCLT filings, regulatory penalties, and insolvency proceedings" },
  { href: "/intelligence/institutional", label: "Institutional Flows", description: "FII, DII, and mutual fund ownership flows and smart-money scores" },
  { href: "/intelligence/world-monitor", label: "World Monitor", description: "Global geopolitical events, supply chains, and foreign markets" },
  { href: "/portfolio/allocation", label: "Allocation", description: "Where your money sits" },
  { href: "/portfolio/risk", label: "Risk", description: "What could go wrong" },
  { href: "/portfolio/attribution", label: "Attribution", description: "What made you money" },
  { href: "/portfolio/quant", label: "Quant", description: "Numbers behind your returns" },
  { href: "/macro", label: "Macro", description: "Macroeconomic nowcast board" },
  { href: "/macro/indices", label: "World indices", description: "Global equity benchmarks — price, volume, ranges" },
  { href: "/markets/india", label: "Markets", description: "NSE equities and indices, live via Upstox" },
  { href: "/markets/derivatives", label: "Derivatives", description: "Option chain with live Greeks" },
  { href: "/markets/sectors", label: "Sectors", description: "Sector intelligence" },
  { href: "/research/ipo", label: "IPOs", description: "Mainboard & SME IPOs with Grey Market Premium (GMP)" },
  { href: "/research/offers", label: "Bonds, Rights & Buybacks", description: "Chittorgarh primary-market calendars for bonds and buybacks" },
  { href: "/data/feeds", label: "Data feeds", description: "Live market feeds & source health" },
  { href: "/data/export", label: "Data export (Excel)", description: "Download every dataset as one structured workbook" },
  { href: "/portfolio/optimizer", label: "Optimizer", description: "Suggest a better mix (learning tool)" },
  { href: "/portfolio/activity", label: "Activity", description: "Trade ledger and realized P&L" },
  { href: "/portfolio/tax", label: "Tax", description: "India STCG/LTCG estimates" },
  { href: "/research/ai-desk", label: "AI Desk", description: "AI-assisted trading desk" },
  { href: "/intelligence", label: "Intelligence", description: "News & events, keyword monitors" },
  { href: "/macro/stress", label: "Stress Index", description: "India macro stress score & convergence alerts" },
  { href: "/macro/stress/backtest", label: "Stress Backtest", description: "Has the stress index predicted anything?" },
  { href: "/macro/transmission", label: "Transmission Map", description: "Sector sensitivity to oil, INR, US yields, S&P" },
  { href: "/macro/scenarios", label: "Scenarios", description: "What-if shocks on sectors and your portfolio" },
  { href: "/macro/rbi", label: "RBI & Liquidity", description: "Policy rates, system liquidity, yield curve" },
  { href: "/intelligence/brief", label: "Daily Brief", description: "Pre-market and post-close brief" },
  { href: "/intelligence/search-trends", label: "Search-trend intelligence", description: "Google Trends Attention Index" },
  { href: "/intelligence/alerts", label: "Alert Rules", description: "Custom market alerts by push or email" },
  { href: "/data/health", label: "Data Health", description: "Freshness and provenance of collected data" },
  { href: "/help", label: "Help center", description: "Setup guides, MCP/Claude connector, terminal app, troubleshooting" },
  { href: "/connect/claude", label: "Connect Claude (MCP)", description: "Full walkthrough to connect Claude via the custom connector" },
];

/** Live-metric shortcuts: id must match a key in src/lib/snapshot.ts METRICS (values come from /api/alerts). */
export const METRIC_COMMANDS: { id: string; href: string }[] = [
  { id: "stress_score", href: "/macro/stress" },
  { id: "convergence_score", href: "/macro/stress" },
  { id: "india_vix", href: "/Home" },
  { id: "us_vix", href: "/macro/global" },
  { id: "nifty", href: "/markets/india" },
  { id: "usdinr", href: "/macro/currency" },
  { id: "brent", href: "/macro/commodities" },
  { id: "us10y", href: "/macro/global" },
  { id: "gsec10y", href: "/macro/rbi" },
  { id: "rbi_net_liquidity", href: "/macro/rbi" },
  { id: "fii_net", href: "/Home" },
];
