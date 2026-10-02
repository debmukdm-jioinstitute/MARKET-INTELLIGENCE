import type { RazorpayPlanId } from "@/lib/payments/plans";

export type PlanFeatureLink = { label: string; path: string; teaser: string };

const BASE: PlanFeatureLink[] = [
  { label: "India dashboard", path: "/markets/india", teaser: "Live indices, flows, macro pulse" },
  { label: "Research workspace", path: "/research", teaser: "Company intel, signals, narratives" },
  { label: "Portfolio tools", path: "/portfolio", teaser: "Holdings, risk, attribution" },
];

const PAID: PlanFeatureLink[] = [
  { label: "AI Desk", path: "/research/ai-desk", teaser: "Unlimited analyses (Free caps at 5/mo)" },
  { label: "Options Flow", path: "/markets/derivatives", teaser: "Full screener, not preview-only" },
  { label: "Claude MCP", path: "/connect/claude", teaser: "Live tools inside Claude, Cursor, Claude Code" },
  { label: "Telegram alerts", path: "/help#telegram", teaser: "Catalyst pings when markets move" },
];

const PRO_ONLY: PlanFeatureLink[] = [
  { label: "Morning briefing", path: "/intelligence/brief", teaser: "Pre-market brief on Pro yearly" },
];

export function planFeatureLinks(planId: RazorpayPlanId, siteUrl: string): PlanFeatureLink[] {
  const root = siteUrl.replace(/\/$/, "");
  const withUrls = (items: PlanFeatureLink[]) =>
    items.map((f) => ({ ...f, path: f.path.startsWith("http") ? f.path : `${root}${f.path}` }));

  if (planId === "pro_annual") return withUrls([...BASE, ...PAID, ...PRO_ONLY]);
  if (planId === "pro_monthly" || planId === "day_pass") return withUrls([...BASE, ...PAID]);
  return withUrls(BASE);
}

export function planFeatureListHtml(planId: RazorpayPlanId, siteUrl: string): string {
  const links = planFeatureLinks(planId, siteUrl);
  return `<ul style="margin:16px 0;padding-left:20px;line-height:1.6;">
${links
  .map(
    (f) =>
      `<li style="margin-bottom:10px;"><a href="${f.path}" style="color:#1a73e8;text-decoration:underline;">${f.label}</a> — ${f.teaser}</li>`,
  )
  .join("\n")}
</ul>`;
}
