import { CRONS } from "@/lib/admin/system";
import { buildSitemapSections } from "@/lib/nav-columns";

export { CRONS };

export const WEB_ONLY_FEATURES: { label: string; href: string; note: string }[] = [
  {
    label: "AI Signals · Options strategy lab",
    href: "/intelligence/ai-signals",
    note: "OptionStrat-style theta spreads on live Upstox chains (sign-in; NIFTY / BANK NIFTY / FINNIFTY).",
  },
  {
    label: "My Portfolio",
    href: "/portfolio",
    note: "Holdings, risk, attribution, optimizer — tied to your account, not MCP.",
  },
  {
    label: "Alerts & scanner bot",
    href: "/intelligence/alerts",
    note: "Saved rules, push/email delivery, Telegram-style bot commands.",
  },
  {
    label: "NIFTY Algo Desk",
    href: "/algo",
    note: "Intraday options research, paper trading, tick replay — portal only.",
  },
  {
    label: "Site assistant",
    href: "/Home",
    note: "Floating AI helper in the signed-in app (navigation and site Q&A).",
  },
  {
    label: "Data export",
    href: "/data/export",
    note: "Download structured Excel of site datasets from the browser.",
  },
  {
    label: "Admin console",
    href: "/admin/system",
    note: "Cron triggers, feature flags, env checklist — admin role only.",
  },
];

/** Portal sections for the help page (same source as the footer sitemap). */
export function helpSitemapSections() {
  return buildSitemapSections();
}
