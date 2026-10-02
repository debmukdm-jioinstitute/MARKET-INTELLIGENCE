import type { RetargetingTemplate } from "@/lib/retargeting/types";

/** Fixed copy skeletons — {{placeholders}} filled per recipient at send time. */
export const RETARGETING_TEMPLATES: RetargetingTemplate[] = [
  {
    id: "upsell_day_to_plus",
    label: "Daily pass → Plus plan",
    goal: "upsell",
    segments: ["active_day_pass", "lapsed_paid"],
    targetPlanId: "pro_monthly",
    subjectTemplate: "{{firstName}}, keep MCP access with Plus ({{targetPrice}}/month)",
    bodyTemplate: `<p>Hi {{firstName}},</p>
<p>You tried Market Intelligence on the {{currentPlan}}. The daily pass ends {{expiresPhrase}} — Plus keeps Claude MCP, full AI Desk, and live market tools without resetting every 24 hours.</p>
<p><strong>Plus plan:</strong> {{targetPrice}}{{targetInterval}}. {{launchOfferLine}}</p>
<p><a href="{{pricingUrl}}">Upgrade to Plus</a> — same account, one click checkout.</p>
<p>Questions? Reply to this email.</p>
<p>— Deb, Market Intelligence</p>`,
  },
  {
    id: "upsell_plus_to_annual",
    label: "Plus → Pro (yearly)",
    goal: "cross_sell",
    segments: ["active_plus", "lapsed_paid"],
    targetPlanId: "pro_annual",
    subjectTemplate: "{{firstName}}, save on a full year of Pro",
    bodyTemplate: `<p>Hi {{firstName}},</p>
<p>You're on {{currentPlan}} ({{expiresPhrase}}). Pro plan is billed once a year at {{targetPrice}}{{targetInterval}} — {{savingsLine}}</p>
<p>Pro adds the morning briefing, Hindi daily brief, and the same Claude MCP connector you use today, with fewer renewals to think about.</p>
<p><a href="{{pricingUrl}}">See Pro plan</a></p>
<p>— Deb, Market Intelligence</p>`,
  },
  {
    id: "win_back_lapsed",
    label: "Win-back (lapsed paid)",
    goal: "win_back",
    segments: ["lapsed_paid"],
    targetPlanId: "pro_monthly",
    subjectTemplate: "{{firstName}}, your Market Intelligence access lapsed",
    bodyTemplate: `<p>Hi {{firstName}},</p>
<p>Your paid access ended {{expiresPhrase}}. Your watchlists and settings are still on your account — pick up where you left off.</p>
<p><strong>Plus plan</strong> {{targetPrice}}{{targetInterval}} restores Claude MCP, Options Flow, and unlimited AI Desk. {{launchOfferLine}}</p>
<p><a href="{{pricingUrl}}">Reactivate Plus</a></p>
<p>— Deb, Market Intelligence</p>`,
  },
  {
    id: "renew_expiring_plus",
    label: "Renew before Plus expires",
    goal: "renew",
    segments: ["expiring_soon", "active_plus"],
    targetPlanId: "pro_monthly",
    subjectTemplate: "{{firstName}}, Plus expires {{expiresAtShort}}",
    bodyTemplate: `<p>Hi {{firstName}},</p>
<p>Your Plus plan expires {{expiresPhrase}}. Renew now so Claude MCP and AI Desk stay uninterrupted.</p>
<p>Or move to <strong>Pro (yearly)</strong> at {{annualPrice}}{{annualInterval}} — {{savingsLine}}</p>
<p><a href="{{pricingUrl}}">Renew or upgrade</a></p>
<p>— Deb, Market Intelligence</p>`,
  },
];

export function getRetargetingTemplate(id: string): RetargetingTemplate | null {
  return RETARGETING_TEMPLATES.find((t) => t.id === id) ?? null;
}
