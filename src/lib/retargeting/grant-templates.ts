import type { RazorpayPlanId } from "@/lib/payments/plans";
import {
  escapeMiEmailHtml,
  miEmailParagraph,
  renderMarketIntelligenceEmail,
} from "@/lib/email/market-intelligence-layout";
import type { RetargetingCustomer } from "@/lib/retargeting/types";

export const GRANTABLE_PLAN_IDS: RazorpayPlanId[] = ["day_pass", "pro_monthly", "pro_annual"];

export type GrantEmailInput = {
  firstName: string;
  grantedPlanId: RazorpayPlanId;
  expiresAtIso: string;
  siteUrl: string;
  personalNote: string;
};

const GRANT_COPY: Record<
  RazorpayPlanId,
  { badge: string; title: string; subject: string; preheader: string; intro: string; footnote: string }
> = {
  day_pass: {
    badge: "DAILY PASS ACTIVATED",
    title: "Your Daily Pass is ready.",
    subject: "{{firstName}}, your Daily Pass is ready",
    preheader: "Complimentary day of full access, no card required",
    intro:
      "Enjoy a complimentary day of Market Intelligence. Explore your dashboard and see what works for you.",
    footnote: "No card required. Just sign in and explore.",
  },
  pro_monthly: {
    badge: "QUARTERLY PASS ACTIVATED",
    title: "Your Quarterly Pass is ready.",
    subject: "{{firstName}}, your Quarterly Pass is ready",
    preheader: "Plus access on us, MCP, scanner, and desk tools",
    intro:
      "We activated complimentary Plus access on your account. Explore your dashboard, Claude MCP, and scanner tools at your pace.",
    footnote: "No checkout needed. Sign in with your existing account.",
  },
  pro_annual: {
    badge: "YEARLY PASS ACTIVATED",
    title: "Your Yearly Pass is ready.",
    subject: "{{firstName}}, your Yearly Pass is ready",
    preheader: "A full year of Pro on us, briefings, MCP, and more",
    intro:
      "You have a complimentary year of Pro on Market Intelligence. Explore briefings, MCP, and everything on the desk.",
    footnote: "No card required. Just sign in and explore.",
  },
};

function formatExpiresShort(expiresAtIso: string): string {
  const expires = new Date(expiresAtIso);
  if (!Number.isFinite(expires.getTime())) return "soon";
  return expires.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function renderGrantEmail(
  member: Pick<RetargetingCustomer, "email" | "name">,
  input: GrantEmailInput,
): { subject: string; html: string } {
  const copy = GRANT_COPY[input.grantedPlanId];
  const firstName =
    (input.firstName?.trim() ||
      member.name?.trim().split(/\s+/)[0] ||
      member.email.split("@")[0] ||
      "there").replace(/[<>]/g, "");
  const expiresAtShort = formatExpiresShort(input.expiresAtIso);
  const root = input.siteUrl.replace(/\/$/, "");
  const note = input.personalNote.trim();
  const personalNoteHtml = note
    ? `<div style="margin-top:16px;padding:12px 14px;background:#f8f9fa;border-radius:8px;font-size:14px;line-height:1.55;color:#3c4043;"><strong>Note from the desk:</strong> ${escapeMiEmailHtml(note)}</div>`
    : "";

  const subject = copy.subject.replace(/\{\{firstName\}\}/g, firstName);
  const html = renderMarketIntelligenceEmail({
    preheader: copy.preheader,
    badge: copy.badge,
    title: copy.title,
    greeting: `Hey ${firstName},`,
    bodyHtml: miEmailParagraph(copy.intro),
    validUntilLabel: `Valid until ${expiresAtShort}`,
    footnote: copy.footnote,
    primaryCta: { label: "Open your dashboard →", href: `${root}/dashboard` },
    secondaryCta: { label: "View plans", href: `${root}/pricing` },
    extraHtml: personalNoteHtml,
    siteUrl: root,
  });

  return { subject, html };
}
