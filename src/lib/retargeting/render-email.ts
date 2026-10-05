import { renderMarketIntelligenceEmail } from "@/lib/email/market-intelligence-layout";
import { applyTemplateVars, buildTemplateVars } from "@/lib/retargeting/audience";
import type { RetargetingCustomer } from "@/lib/retargeting/types";
import type { RetargetingTemplate } from "@/lib/retargeting/types";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Retargeting / lifecycle mail inside the official Market Intelligence card template.
 */
export function renderRetargetingEmail(
  customer: RetargetingCustomer,
  template: RetargetingTemplate,
  siteUrl: string,
): { subject: string; html: string } {
  const vars = buildTemplateVars(customer, template.targetPlanId, siteUrl);
  const subject = applyTemplateVars(template.subjectTemplate, vars);
  const preheader = esc(applyTemplateVars(template.preheaderTemplate ?? "", vars));
  const bodyInner = applyTemplateVars(template.bodyTemplate, vars);
  const root = siteUrl.replace(/\/$/, "");
  const html = renderMarketIntelligenceEmail({
    preheader,
    badge: "FOR YOU",
    title: subject.length > 100 ? `${subject.slice(0, 97)}…` : subject,
    bodyHtml: bodyInner,
    primaryCta: { label: "Open your dashboard →", href: `${root}/dashboard` },
    secondaryCta: { label: "View plans", href: `${root}/pricing` },
    siteUrl: root,
  });

  return { subject, html };
}
