import type { RetargetingTemplate } from "@/lib/retargeting/types";

/**
 * Fixed copy skeletons — {{placeholders}} filled per recipient at send time.
 *
 * Deliverability: these read as personal founder notes, not marketing blasts.
 * Short personal subjects, one link max, no salesy trigger words (no "upgrade
 * now", "limited time", "discount", ALL CAPS, or exclamation-heavy CTAs), so
 * Gmail is more likely to file them under Primary.
 */
export const RETARGETING_TEMPLATES: RetargetingTemplate[] = [
  {
    id: "upsell_day_to_plus",
    label: "Daily pass → Plus plan",
    goal: "upsell",
    segments: ["active_day_pass", "lapsed_paid"],
    targetPlanId: "pro_monthly",
    subjectTemplate: "{{firstName}}, quick question about your daily pass",
    preheaderTemplate: "Noticed your pass ends soon — one thought from me",
    bodyTemplate: `<p>Hi {{firstName}},</p>
<p>I noticed you tried Market Intelligence on the {{currentPlan}}, which ends {{expiresPhrase}}. Just wanted to personally mention that Plus keeps everything running — the AI Desk, scanner, and market tools — without the daily reset.</p>
<p>It's {{targetPrice}}{{targetInterval}} if you ever want it: <a href="{{pricingUrl}}">see the plans</a></p>
<p>No pressure either way. And if something felt missing or broken during your pass, I'd genuinely like to hear about it — just reply to this email.</p>
<p>— Debabrata</p>`,
  },
  {
    id: "upsell_plus_to_annual",
    label: "Plus → Pro (yearly)",
    goal: "cross_sell",
    segments: ["active_plus", "lapsed_paid"],
    targetPlanId: "pro_annual",
    subjectTemplate: "{{firstName}}, one thought on renewals",
    preheaderTemplate: "A quieter way to stay on Plus, if you're interested",
    bodyTemplate: `<p>Hi {{firstName}},</p>
<p>You're on {{currentPlan}} ({{expiresPhrase}}). A few members asked for a way to stop thinking about renewals, so there's now a yearly option at {{targetPrice}}{{targetInterval}} — same Plus features, one payment a year.</p>
<p>Details are here if you're curious: <a href="{{pricingUrl}}">see the plans</a></p>
<p>Monthly is completely fine to stay on too. Reply anytime if you have questions.</p>
<p>— Debabrata</p>`,
  },
  {
    id: "win_back_lapsed",
    label: "Win-back (lapsed paid)",
    goal: "win_back",
    segments: ["lapsed_paid"],
    targetPlanId: "pro_monthly",
    subjectTemplate: "{{firstName}}, your desk is still here",
    preheaderTemplate: "Everything you set up is saved — come take a look",
    bodyTemplate: `<p>Hi {{firstName}},</p>
<p>Your paid access ended {{expiresPhrase}}. I wanted you to know your watchlists, alerts, and settings are all still saved on your account — nothing was deleted.</p>
<p>If you ever want to pick up where you left off, Plus is {{targetPrice}}{{targetInterval}}: <a href="{{pricingUrl}}">see the plans</a></p>
<p>And if you left because something wasn't working for you, I'd really appreciate a reply telling me what it was. That feedback shapes what I build next.</p>
<p>— Debabrata</p>`,
  },
  {
    id: "renew_expiring_plus",
    label: "Renew before Plus expires",
    goal: "renew",
    segments: ["expiring_soon", "active_plus"],
    targetPlanId: "pro_monthly",
    subjectTemplate: "{{firstName}}, heads up — Plus ends {{expiresAtShort}}",
    preheaderTemplate: "Just a friendly reminder, nothing urgent",
    bodyTemplate: `<p>Hi {{firstName}},</p>
<p>A quick heads-up from me: your Plus plan ends {{expiresPhrase}}. If you do nothing, it simply lapses — no surprise charges, I promise.</p>
<p>To keep things running without a gap: <a href="{{pricingUrl}}">see the plans</a></p>
<p>Questions about anything? Just reply — I read every email myself.</p>
<p>— Debabrata</p>`,
  },
];

export function getRetargetingTemplate(id: string): RetargetingTemplate | null {
  return RETARGETING_TEMPLATES.find((t) => t.id === id) ?? null;
}
