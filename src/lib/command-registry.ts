/** Static route registry for the command palette's "Pages" group and help view. */
export type PageCommand = {
  href: string;
  label: string;
  description: string;
};

export const PAGE_COMMANDS: PageCommand[] = [
  { href: "/Home", label: "Dashboard", description: "India desk overview & institutional cockpit" },
  { href: "/portfolio", label: "Portfolios", description: "Portfolio management" },
  { href: "/companies?section=broker-consensus", label: "Research & Broker Consensus", description: "Security workbench & 11 institutional broker reports" },
  { href: "/companies?section=promoters", label: "Promoter & Insider Activity", description: "Promoter buying, selling, pledges, and block deals" },
  { href: "/companies?section=credit", label: "Credit & Solvency Radar", description: "CRISIL, ICRA, CARE rating upgrades, downgrades & debt watch alerts" },
  { href: "/companies?section=company", label: "Company & Concall Intelligence", description: "Company disclosure timelines, concall tone, guidance and valuation sandbox" },
  { href: "/companies?section=retail-sentiment", label: "Reddit Retail Sentiment", description: "Retail Sentiment Engine across r/IndianStreetBets, r/IndiaInvestments" },
  { href: "/intelligence/scanner", label: "Technical Scanners", description: "Breakout scans, VCP setups, golden crosses, and moving averages" },
  { href: "/trade?section=ai-signals", label: "AI Signals", description: "Autonomous multi-agent trade recommendations and market lean" },
  { href: "/companies?section=legal-risk", label: "Legal & Insolvency Risk", description: "NCLT filings, regulatory penalties, and insolvency proceedings" },
  { href: "/funds?section=institutional", label: "Institutional Flows", description: "FII, DII, and mutual fund ownership flows and smart-money scores" },
  { href: "/Home?section=world-monitor", label: "World Monitor", description: "Global geopolitical events, supply chains, and foreign markets" },
  { href: "/portfolio?section=allocation", label: "Allocation", description: "Where your money sits" },
  { href: "/portfolio?section=risk", label: "Risk", description: "What could go wrong" },
  { href: "/portfolio?section=attribution", label: "Attribution", description: "What made you money" },
  { href: "/portfolio?section=factors", label: "Quant", description: "Numbers behind your returns" },
  { href: "/economy", label: "Macro", description: "Macroeconomic nowcast board" },
  { href: "/markets?section=world", label: "World indices", description: "Global equity benchmarks — price, volume, ranges" },
  { href: "/markets?section=india", label: "Markets", description: "NSE equities and indices, live via Upstox" },
  { href: "/trade?section=derivatives", label: "Derivatives", description: "Option chain with live Greeks" },
  { href: "/markets?section=sectors", label: "Sectors", description: "Sector intelligence" },
  { href: "/companies?section=ipo", label: "IPOs", description: "Mainboard & SME IPOs with Grey Market Premium (GMP)" },
  { href: "/companies?section=offers", label: "Bonds, Rights & Buybacks", description: "Chittorgarh primary-market calendars for bonds and buybacks" },
  { href: "/data?section=feeds", label: "Data feeds", description: "Live market feeds & source health" },
  { href: "/data?section=export", label: "Data export (Excel)", description: "Download every dataset as one structured workbook" },
  { href: "/portfolio?section=optimizer", label: "Optimizer", description: "Suggest a better mix (learning tool)" },
  { href: "/portfolio?section=activity", label: "Activity", description: "Trade ledger and realized P&L" },
  { href: "/portfolio?section=tax", label: "Tax", description: "India STCG/LTCG estimates" },
  { href: "/research/ai-desk", label: "AI Desk", description: "AI-assisted trading desk" },
  { href: "/Home?section=feed", label: "Intelligence", description: "News & events, keyword monitors" },
  { href: "/economy?section=macro-stress", label: "Stress Index", description: "India macro stress score & convergence alerts" },
  { href: "/macro/stress/backtest", label: "Stress Backtest", description: "Has the stress index predicted anything?" },
  { href: "/economy?section=transmission", label: "Transmission Map", description: "Sector sensitivity to oil, INR, US yields, S&P" },
  { href: "/economy?section=scenarios", label: "Scenarios", description: "What-if shocks on sectors and your portfolio" },
  { href: "/economy?section=rbi", label: "RBI & Liquidity", description: "Policy rates, system liquidity, yield curve" },
  { href: "/Home?section=brief", label: "Daily Brief", description: "Pre-market and post-close brief" },
  { href: "/companies?section=search-trends", label: "Search-trend intelligence", description: "Google Trends Attention Index" },
  { href: "/trade?section=alerts", label: "Alert Rules", description: "Custom market alerts by push or email" },
  { href: "/data?section=health", label: "Data Health", description: "Freshness and provenance of collected data" },
  { href: "/help", label: "Help center", description: "Setup guides, MCP/Claude connector, terminal app, troubleshooting" },
  { href: "/connect/claude", label: "Connect Claude (MCP)", description: "Full walkthrough to connect Claude via the custom connector" },
];

/** Live-metric shortcuts: id must match a key in src/lib/snapshot.ts METRICS (values come from /api/alerts). */
export const METRIC_COMMANDS: { id: string; href: string }[] = [
  { id: "stress_score", href: "/economy?section=macro-stress" },
  { id: "convergence_score", href: "/economy?section=macro-stress" },
  { id: "india_vix", href: "/Home" },
  { id: "us_vix", href: "/economy?section=global-data" },
  { id: "nifty", href: "/markets?section=india" },
  { id: "usdinr", href: "/markets?section=currency" },
  { id: "brent", href: "/markets?section=commodities" },
  { id: "us10y", href: "/economy?section=global-data" },
  { id: "gsec10y", href: "/economy?section=rbi" },
  { id: "rbi_net_liquidity", href: "/economy?section=rbi" },
  { id: "fii_net", href: "/Home" },
];
