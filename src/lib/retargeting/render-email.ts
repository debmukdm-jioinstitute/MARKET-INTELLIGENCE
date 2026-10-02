import { GOOGLE_SANS_FONT_FAMILY_CSS } from "@/lib/typography";
import { applyTemplateVars, buildTemplateVars } from "@/lib/retargeting/audience";
import type { RetargetingCustomer } from "@/lib/retargeting/types";
import type { RetargetingTemplate } from "@/lib/retargeting/types";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Plain-text-first wrapper: no cards, no banners, no heavy layout — the email
 * should read like a personal note from the founder. Minimal links (the body
 * carries at most one), which keeps Gmail from filing it under Promotions.
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
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#ffffff;${GOOGLE_SANS_FONT_FAMILY_CSS};color:#202124;font-size:15px;line-height:1.7;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <div style="max-width:560px;margin:0 auto;padding:28px 20px;">
    ${bodyInner}
    <p style="margin:28px 0 0;font-size:13px;color:#5f6368;">—<br/>Debabrata Mukherjee<br/>Market Intelligence</p>
  </div>
</body>
</html>`;
  return { subject, html };
}
