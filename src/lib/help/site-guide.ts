import { buildSitemapSections } from "@/lib/nav-columns";

export function helpSitemapSections() {
  return buildSitemapSections();
}
/** Account-scoped MCP tools (after mi_sign_in + X-MI-Session). Help page mirrors this list; TOOLS registry is source of truth. */
export const MCP_ACCOUNT_TOOLS: { name: string; label: string; note: string }[] = [
  { name: "mi_sign_in", label: "Sign in", note: "Email/password → sessionToken." },
  { name: "mi_session_status", label: "Session", note: "Who is signed in." },
  { name: "get_my_portfolio", label: "Portfolio read", note: "Holdings + analysis." },
  { name: "add_holding", label: "Add holding", note: "Merge duplicate symbols." },
  { name: "remove_holding", label: "Remove holding", note: "Drop full line." },
  { name: "sell_holding", label: "Sell / trim", note: "Partial sell + trade log." },
  { name: "update_portfolio_settings", label: "Portfolio settings", note: "Name + benchmark." },
  { name: "parse_portfolio_statement", label: "Parse statement", note: "Any broker CSV/text preview." },
  { name: "import_portfolio_holdings", label: "Import holdings", note: "Commit parsed book." },
  { name: "get_my_portfolio_activity", label: "Activity", note: "Trades + realized P&L." },
  { name: "get_my_portfolio_tax", label: "Tax estimate", note: "India STCG/LTCG illustrative." },
  { name: "get_my_watchlist", label: "Watchlist read", note: "" },
  { name: "add_to_watchlist", label: "Watchlist add", note: "" },
  { name: "remove_from_watchlist", label: "Watchlist remove", note: "" },
  { name: "get_my_alerts", label: "Alerts read", note: "Rules + events." },
  { name: "create_alert", label: "Create alert", note: "" },
  { name: "delete_alert", label: "Delete alert", note: "" },
  { name: "set_alert_active", label: "Toggle alert", note: "" },
  { name: "get_optionstrat_recommend", label: "Options strategy lab", note: "Theta spreads." },
  { name: "ask_site_assistant", label: "Site assistant", note: "One-shot Q&A." },
  { name: "get_data_export_info", label: "Data export", note: "Excel download path." },
  { name: "get_admin_system", label: "Admin console", note: "Admin role only." },
];

/** Still browser-first (streaming UI, OAuth, live order buttons). */
export const PORTAL_ONLY_UI: { label: string; href: string; note: string }[] = [
  { label: "Google sign-in", href: "/login", note: "OAuth: use website; MCP uses mi_sign_in email/password." },
  { label: "Streaming Ask Deb panel", href: "/Home", note: "Multi-turn chat UI; MCP has ask_site_assistant one-shot." },
];
