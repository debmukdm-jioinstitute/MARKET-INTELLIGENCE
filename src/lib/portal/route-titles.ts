import { HUBS } from "@/lib/hubs";

/** Deep tools that are not hub sections. */
const PATH_TITLES: Record<string, string> = {
  "/Home": "Today",
  "/intelligence/scanner": "Stock scanner",
  "/intelligence/trade-lab": "Trade Lab",
  "/research/ai-desk": "AI Desk",
  "/research/options-flow": "Options flow",
  "/macro/stress/backtest": "Stress backtest",
  "/pricing": "Pricing",
  "/profile": "Profile",
  "/help": "Help",
};

/** Browser-tab title: hub pages are named by their `?section=` (e.g. "RBI · Economy"), deep tools by path. */
export function portalDocumentTitle(pathname: string, search: URLSearchParams): string {
  const hub = Object.values(HUBS).find((h) => h.route === pathname);
  let base: string;
  if (hub) {
    const label = hub.sections.find((s) => s.id === search.get("section"))?.label;
    base = label && pathname !== "/Home" ? `${label} · ${hub.title}` : hub.title;
  } else {
    base = PATH_TITLES[pathname] ?? pathname.split("/").filter(Boolean).slice(-1)[0]?.replace(/-/g, " ") ?? "Desk";
  }
  return `${base.charAt(0).toUpperCase()}${base.slice(1)} · Market Intelligence`;
}
