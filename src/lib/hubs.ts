/**
 * Hub registry: the 7 primary hubs plus the Data utility hub (sitemap consolidation).
 * One source of truth for hub routes, section anchors, nav links and legacy redirects.
 * Hub pages must supply a slot for every section id (typed via HubSlots).
 */
export type HubSectionDef = { id: string; label: string; /** Extra anchors inside this section (e.g. cluster sub-sections). */ subs?: readonly string[] };

export const HUBS = {
  today: {
    title: "Today", route: "/Home", tagline: "What is happening in markets right now",
    sections: [
      { id: "hero", label: "Overview" },
      { id: "pulse", label: "Pulse" },
      { id: "brief", label: "Daily brief" },
      { id: "calendar", label: "Economic calendar" },
      { id: "feed", label: "Intelligence feed" },
      { id: "world-monitor", label: "World monitor" },
      { id: "start-here", label: "Start here" },
    ],
  },
  markets: {
    title: "Markets", route: "/markets", tagline: "India and world tape, breadth, valuation, activity, mood and market stress",
    sections: [
      { id: "india", label: "India markets" },
      { id: "world", label: "World indices" },
      { id: "currency", label: "Currency" },
      { id: "commodities", label: "Commodities" },
      { id: "breadth", label: "Breadth & momentum" },
      { id: "sectors", label: "Sector map" },
      { id: "valuation", label: "Valuation" },
      { id: "activity", label: "Market activity" },
      { id: "fear-greed", label: "Fear & Greed" },
      { id: "market-stress", label: "Market stress" },
      { id: "flows-teaser", label: "Flows" },
    ],
  },
  economy: {
    title: "Economy", route: "/economy", tagline: "Macro, RBI, yields, global data, scenarios and macro stress",
    sections: [
      { id: "global-board", label: "Global board" },
      { id: "india-macro", label: "India macro" },
      { id: "rbi", label: "RBI & liquidity" },
      { id: "yields", label: "Yields" },
      { id: "global-data", label: "Global data", subs: ["world-bank"] },
      { id: "macro-stress", label: "Stress index" },
      { id: "scenarios", label: "Scenarios" },
      { id: "transmission", label: "Shock transmission" },
      { id: "calendar", label: "Economic calendar" },
    ],
  },
  funds: {
    title: "Funds & Flows", route: "/funds", tagline: "FII/DII, mutual funds, ETFs, SIPs and margin trading",
    sections: [
      { id: "institutional", label: "Institutional flows" },
      { id: "funds-overview", label: "Funds intelligence" },
      { id: "categories", label: "Fund categories" },
      { id: "nfo-distribution", label: "NFO & distribution" },
      { id: "sip", label: "SIP ownership" },
      { id: "passive", label: "Passive & index" },
      { id: "geo-aum", label: "Geographic AUM" },
      { id: "scheme-size", label: "Scheme size" },
      { id: "etf", label: "ETF spreads" },
      { id: "mtf", label: "Margin trading (MTF)" },
    ],
  },
  companies: {
    title: "Companies", route: "/companies", tagline: "Research any listed company",
    sections: [
      { id: "company", label: "Company page" },
      { id: "company-stress", label: "Company stress", subs: ["promoters", "credit", "legal-risk"] },
      { id: "ai-desk", label: "AI Desk" },
      { id: "broker-consensus", label: "Broker consensus" },
      { id: "research-notes", label: "MI research notes" },
      { id: "retail-sentiment", label: "Retail sentiment" },
      { id: "search-trends", label: "Search trends" },
      { id: "ipo", label: "IPO pipeline" },
      { id: "offers", label: "Bonds, rights & buybacks" },
    ],
  },
  trade: {
    title: "Trade", route: "/trade", tagline: "Scan, test and track short-term ideas",
    sections: [
      { id: "scanner", label: "Stock scanner" },
      { id: "lab", label: "Trade Lab" },
      { id: "alerts", label: "Alerts" },
      { id: "options-flow", label: "Options flow" },
      { id: "ai-signals", label: "AI signals" },
      { id: "backtesting", label: "Backtesting" },
      { id: "derivatives", label: "Derivatives" },
      { id: "leverage", label: "Margin trading (MTF)" },
    ],
  },
  portfolio: {
    title: "Portfolio", route: "/portfolio", tagline: "Holdings, risk and tax",
    sections: [
      { id: "overview", label: "Overview" },
      { id: "watchlist", label: "Watchlist" },
      { id: "allocation", label: "Allocation" },
      { id: "activity", label: "Trade log" },
      { id: "risk", label: "Risk" },
      { id: "attribution", label: "Attribution" },
      { id: "factors", label: "Factor exposure" },
      { id: "optimizer", label: "Optimizer" },
      { id: "tax", label: "Tax" },
    ],
  },
  data: {
    title: "Data", route: "/data", tagline: "Sources, freshness and export",
    sections: [
      { id: "sources", label: "Sources & status" },
      { id: "indicators", label: "Indicators" },
      { id: "health", label: "Data health" },
      { id: "feeds", label: "Data feeds" },
      { id: "world-bank", label: "World Bank data" },
      { id: "export", label: "Data export" },
    ],
  },
} as const satisfies Record<string, { title: string; route: string; tagline: string; sections: readonly HubSectionDef[] }>;

export type HubKey = keyof typeof HUBS;
export type HubSectionId<K extends HubKey> = (typeof HUBS)[K]["sections"][number]["id"];
export type HubSlots<K extends HubKey> = Record<HubSectionId<K>, React.ReactNode>;

/** Hub route roots, used to suppress per-page sibling tabs and the chart panel on hubs. */
export const HUB_ROUTES: string[] = Object.values(HUBS).map((h) => h.route);
export const isHubRoute = (path: string) => HUB_ROUTES.includes(path.split(/[?#]/)[0]!.replace(/(.)\/$/, "$1"));

/** All valid anchor ids for a hub (sections + sub-anchors). */
export function hubAnchors(key: HubKey): string[] {
  return HUBS[key].sections.flatMap((s) => [s.id, ...(("subs" in s ? s.subs : []) as readonly string[])]);
}
export const hubHref = (key: HubKey, anchor?: string) => `${HUBS[key].route}${anchor ? `?section=${anchor}` : ""}`;
