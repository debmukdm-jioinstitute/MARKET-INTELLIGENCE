import { CRONS } from "@/lib/admin/system";
import { buildSitemapSections } from "@/lib/nav-columns";

export { CRONS };

/** Account-scoped MCP tools (after mi_sign_in + X-MI-Session). */
export const MCP_ACCOUNT_TOOLS: { name: string; label: string; note: string }[] = [
  { name: "get_optionstrat_recommend", label: "Options strategy lab", note: "OptionStrat spreads — index, bias, risk." },
  { name: "get_my_portfolio", label: "My portfolio", note: "Holdings + analysis." },
  { name: "get_my_alerts", label: "Alerts", note: "Rules and recent events (read-only via MCP)." },
  { name: "get_algo_desk_snapshot", label: "NIFTY Algo Desk", note: "Live/demo desk state." },
  { name: "ask_site_assistant", label: "Site assistant", note: "One-shot Q&A." },
  { name: "get_data_export_info", label: "Data export", note: "Download path + limits; workbook via HTTP GET." },
  { name: "get_admin_system", label: "Admin console", note: "Crons, env, flags — admin role only." },
];

/** Still browser-first (create/edit flows, streaming UI, OAuth). */
export const PORTAL_ONLY_UI: { label: string; href: string; note: string }[] = [
  { label: "Alert rule editor", href: "/intelligence/alerts", note: "Create/patch/delete rules in the UI; MCP lists rules only." },
  { label: "Portfolio import", href: "/portfolio", note: "Broker CSV / Upstox import — not exposed on MCP." },
  { label: "Algo live execution", href: "/algo/live", note: "Paper/live trading controls stay in the portal." },
  { label: "Google sign-in", href: "/login", note: "OAuth accounts: use website; MCP uses email/password via mi_sign_in." },
];

export function helpSitemapSections() {
  return buildSitemapSections();
}
