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
  { href: "/portfolio/optimizer", label: "Optimizer", description: "Mean-variance / risk parity" },
  { href: "/research/ai-desk", label: "AI Desk", description: "AI-assisted trading desk" },
  { href: "/intelligence", label: "Intelligence", description: "News & events" },
];
