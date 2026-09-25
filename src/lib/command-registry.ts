/** Static route registry for the command palette's "Pages" group and help view. */
export type PageCommand = {
  href: string;
  label: string;
  description: string;
};

export const PAGE_COMMANDS: PageCommand[] = [
  { href: "/Home", label: "Dashboard", description: "India desk overview" },
  { href: "/portfolio", label: "Portfolios", description: "Portfolio management" },
  { href: "/research", label: "Research", description: "Security workbench" },
  { href: "/portfolio/allocation", label: "Allocation", description: "Policy vs actual" },
  { href: "/portfolio/risk", label: "Risk", description: "Active risk budget" },
  { href: "/portfolio/attribution", label: "Attribution", description: "Brinson-Fachler performance attribution" },
  { href: "/portfolio/quant", label: "Quant", description: "Return distribution & active statistics" },
  { href: "/macro", label: "Macro", description: "Macroeconomic nowcast board" },
  { href: "/markets", label: "Markets", description: "Investable universe" },
  { href: "/markets/india", label: "India Markets", description: "NSE equities, live via Upstox" },
  { href: "/markets/derivatives", label: "Derivatives", description: "Option chain with live Greeks" },
  { href: "/markets/sectors", label: "Sectors", description: "Sector intelligence" },
  { href: "/research/ipo", label: "IPOs", description: "Mainboard & SME IPOs" },
  { href: "/data/feeds", label: "Data feeds", description: "Live market feeds & source health" },
  { href: "/data/export", label: "Data export (Excel)", description: "Download every dataset as one structured workbook" },
  { href: "/portfolio/optimizer", label: "Optimizer", description: "Mean-variance / risk parity" },
  { href: "/research/ai-desk", label: "AI Desk", description: "AI-assisted trading desk" },
  { href: "/intelligence", label: "Intelligence", description: "News & events, keyword monitors" },
  { href: "/macro/stress", label: "Stress Index", description: "India macro stress score & convergence alerts" },
  { href: "/macro/stress/backtest", label: "Stress Backtest", description: "Has the stress index predicted anything?" },
  { href: "/macro/transmission", label: "Transmission Map", description: "Sector sensitivity to oil, INR, US yields, S&P" },
  { href: "/macro/scenarios", label: "Scenarios", description: "What-if shocks on sectors and your portfolio" },
  { href: "/macro/rbi", label: "RBI & Liquidity", description: "Policy rates, system liquidity, yield curve" },
  { href: "/intelligence/brief", label: "Daily Brief", description: "Pre-market and post-close brief" },
  { href: "/intelligence/alerts", label: "Alert Rules", description: "Custom market alerts by push or email" },
  { href: "/data/health", label: "Data Health", description: "Freshness and provenance of collected data" },
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
