/** Static route registry for the command palette's "Pages" group and help view. */
export type PageCommand = {
  href: string;
  label: string;
  description: string;
};

export const PAGE_COMMANDS: PageCommand[] = [
  { href: "/dashboard", label: "Dashboard", description: "India desk overview" },
  { href: "/app", label: "Command", description: "Institutional virtual desk" },
  { href: "/portfolio", label: "Portfolios", description: "Portfolio management" },
  { href: "/research", label: "Research", description: "Security workbench" },
  { href: "/allocation", label: "Allocation", description: "Policy vs actual" },
  { href: "/risk", label: "Risk", description: "Active risk budget" },
  { href: "/attribution", label: "Attribution", description: "Brinson-Fachler performance attribution" },
  { href: "/quant", label: "Quant", description: "Return distribution & active statistics" },
  { href: "/macro", label: "Macro", description: "Macroeconomic nowcast board" },
  { href: "/markets", label: "Markets", description: "Investable universe" },
  { href: "/india-markets", label: "India Markets", description: "NSE equities, live via Upstox" },
  { href: "/derivatives", label: "Derivatives", description: "Option chain with live Greeks" },
  { href: "/ipo", label: "IPOs", description: "Mainboard & SME IPOs" },
  { href: "/feeds", label: "Data feeds", description: "Live market feeds & source health" },
  { href: "/scenarios", label: "Scenarios", description: "Regime shocks on the working book" },
  { href: "/optimizer", label: "Optimizer", description: "Mean-variance / risk parity" },
  { href: "/backtest", label: "Backtest", description: "Rule-based allocation replay" },
  { href: "/reports", label: "Reports", description: "Investment committee pack" },
];
