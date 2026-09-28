const TAB_TITLES: Record<string, Record<string, string>> = {
  "/markets/sectors": {
    performance: "Sector performance",
    rotation: "Sector rotation",
    valuation: "Sector valuation",
    fundamentals: "Sector fundamentals",
  },
  "/markets/breadth": {
    breadth: "Market breadth",
    momentum: "Market momentum",
  },
};

const PATH_TITLES: Record<string, string> = {
  "/Home": "Home",
  "/markets": "Markets",
  "/markets/india": "Indian markets",
  "/markets/sectors": "Sector intelligence",
  "/markets/breadth": "Market breadth",
  "/markets/derivatives": "Derivatives",
  "/macro": "Macro board",
  "/macro/india": "India macro",
  "/macro/rbi": "RBI & liquidity",
  "/macro/indices": "World indices",
  "/macro/currency": "Currency",
  "/macro/commodities": "Commodities",
  "/macro/global": "Global macro",
  "/macro/stress": "Macro stress",
  "/intelligence/world-monitor": "World Monitor",
  "/intelligence/brief": "Daily brief",
  "/intelligence/scanner": "Stock scanner",
  "/portfolio": "Portfolio",
  "/research": "Research",
  "/help": "Help",
};

export function portalDocumentTitle(pathname: string, search: URLSearchParams): string {
  const viewKey = pathname === "/macro/india" && search.get("view") === "calendar" ? null : search.get("tab") ?? search.get("view");
  const tabMap = TAB_TITLES[pathname];
  const tabLabel = viewKey && tabMap?.[viewKey];

  const base =
    tabLabel ??
    (pathname === "/macro/india" && search.get("view") === "calendar"
      ? "Economic calendar"
      : (PATH_TITLES[pathname] ?? pathname.split("/").filter(Boolean).slice(-1)[0]?.replace(/-/g, " ") ?? "Desk"));

  const titled = base.charAt(0).toUpperCase() + base.slice(1);
  return `${titled} · Market Intelligence`;
}
