import { getRazorpayPlan, type RazorpayPlanId } from "@/lib/payments/plans";
import { planLabel } from "@/lib/retargeting/audience";
import { planFeatureListHtml } from "@/lib/retargeting/plan-features";
import { renderRetargetingEmail } from "@/lib/retargeting/render-email";
import type { RetargetingCustomer, RetargetingTemplate } from "@/lib/retargeting/types";

export const GRANTABLE_PLAN_IDS: RazorpayPlanId[] = ["day_pass", "pro_monthly", "pro_annual"];

export type GrantEmailInput = {
  firstName: string;
  grantedPlanId: RazorpayPlanId;
  expiresAtIso: string;
  siteUrl: string;
  personalNote: string;
};

function grantTemplateForPlan(planId: RazorpayPlanId): RetargetingTemplate {
  const plan = getRazorpayPlan(planId);
  const name = plan?.name ?? planLabel(planId);
  const id: RetargetingTemplate["id"] = `grant_${planId}` as RetargetingTemplate["id"];

  const bodies: Record<RazorpayPlanId, { subject: string; preheader: string; body: string }> = {
    day_pass: {
      subject: "{{firstName}}, your 24-hour all-access pass is live",
      preheader: "No checkout, just open the desk and poke around",
      body: `<p>Hey {{firstName}},</p>
<p>We flipped on a complimentary <strong>Daily pass</strong> on your Market Intelligence account, think of it as a no-strings test drive before anyone asks for your card.</p>
<p><strong>Good until {{expiresAtShort}}.</strong> Here is the fun stuff you can actually use:</p>
{{featureListHtml}}
<p>Start here when you are ready: <a href="{{dashboardUrl}}">open your dashboard</a> · <a href="{{pricingUrl}}">see plans later</a></p>
{{personalNoteBlock}}
<p>Debabrata</p>`,
    },
    pro_monthly: {
      subject: "{{firstName}}, Plus is on the house for a bit",
      preheader: "MCP, AI Desk, options, the works, on us",
      body: `<p>Hey {{firstName}},</p>
<p>Startup rule #47: sometimes you comp the curious ones. We activated <strong>Plus</strong> on your account, full paid access, zero invoice drama.</p>
<p><strong>Active through {{expiresAtShort}}.</strong> What that unlocks (with links, because we are helpful like that):</p>
{{featureListHtml}}
<p>Hop in: <a href="{{dashboardUrl}}">dashboard</a> · wire Claude via <a href="{{mcpUrl}}">MCP setup</a> · <a href="{{pricingUrl}}">pricing</a> when you want to stay after the gift period</p>
{{personalNoteBlock}}
<p>Debabrata</p>`,
    },
    pro_annual: {
      subject: "{{firstName}}, welcome to Pro, we picked up the tab",
      preheader: "Yearly Pro comp: briefings, MCP, the whole parade",
      body: `<p>Hey {{firstName}},</p>
<p>You have been upgraded to <strong>Pro (yearly)</strong> on us, the “everything including the kitchen-sink briefing” tier. No confetti cannon in your inbox, but mentally we are doing a tiny desk dance.</p>
<p><strong>Runs until {{expiresAtShort}}.</strong> Your feature map:</p>
{{featureListHtml}}
<p>Main doors: <a href="{{dashboardUrl}}">dashboard</a> · <a href="{{mcpUrl}}">Claude MCP</a> · morning vibe at <a href="{{briefUrl}}">daily brief</a></p>
{{personalNoteBlock}}
<p>Debabrata</p>`,
    },
  };

  const b = bodies[planId];
  return {
    id,
    label: `Complimentary ${name}`,
    goal: "renew",
    segments: [],
    targetPlanId: planId,
    subjectTemplate: b.subject.replace(/\{\{firstName\}\}/g, "{{firstName}}"),
    preheaderTemplate: b.preheader,
    bodyTemplate: b.body,
  };
}

export function buildGrantTemplateVars(input: GrantEmailInput): Record<string, string> {
  const expires = new Date(input.expiresAtIso);
  const expiresAtShort = Number.isFinite(expires.getTime())
    ? expires.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "soon";
  const root = input.siteUrl.replace(/\/$/, "");
  const note = input.personalNote.trim();
  const personalNoteBlock = note
    ? `<p style="margin-top:16px;padding:12px 14px;background:#f8f9fa;border-radius:8px;font-size:14px;"><strong>Note from the desk:</strong> ${note.replace(/</g, "&lt;")}</p>`
    : "";

  return {
    firstName: input.firstName,
    expiresAtShort,
    featureListHtml: planFeatureListHtml(input.grantedPlanId, root),
    dashboardUrl: `${root}/dashboard`,
    mcpUrl: `${root}/connect/claude`,
    briefUrl: `${root}/intelligence/brief`,
    pricingUrl: `${root}/pricing`,
    personalNoteBlock,
    currentPlan: planLabel(input.grantedPlanId),
    expiresPhrase: `until ${expiresAtShort}`,
    targetPrice: "",
    targetInterval: "",
    annualPrice: "",
    annualInterval: "",
    savingsLine: "",
    launchOfferLine: "",
  };
}

export function renderGrantEmail(
  member: Pick<RetargetingCustomer, "email" | "name">,
  input: GrantEmailInput,
): { subject: string; html: string } {
  const template = grantTemplateForPlan(input.grantedPlanId);
  const vars = buildGrantTemplateVars(input);
  const firstName =
    (member.name?.trim().split(/\s+/)[0] || member.email.split("@")[0] || "there").replace(/[<>]/g, "");

  const customer: RetargetingCustomer = {
    email: member.email,
    name: member.name,
    segment: "lapsed_paid",
    suggestedTemplateId: "",
    currentPlanId: input.grantedPlanId,
    currentPlanLabel: planLabel(input.grantedPlanId),
    entitlementActive: true,
    expiresAt: input.expiresAtIso,
    lastPaidAt: null,
    paidOrderCount: 0,
    plansEverPurchased: [],
  };

  const base = renderRetargetingEmail(customer, template, input.siteUrl);
  const subject = template.subjectTemplate.replace(/\{\{firstName\}\}/g, firstName);
  let html = base.html;
  for (const [key, val] of Object.entries({ ...vars, firstName })) {
    html = html.replaceAll(`{{${key}}}`, val);
  }
  return { subject, html };
}
