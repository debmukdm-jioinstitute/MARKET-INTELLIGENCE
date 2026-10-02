import { GOOGLE_SANS_FONT_FAMILY_CSS } from "@/lib/typography";
import { applyTemplateVars, buildTemplateVars } from "@/lib/retargeting/audience";
import type { RetargetingCustomer } from "@/lib/retargeting/types";
import type { RetargetingTemplate } from "@/lib/retargeting/types";

export function renderRetargetingEmail(
  customer: RetargetingCustomer,
  template: RetargetingTemplate,
  siteUrl: string,
): { subject: string; html: string } {
  const vars = buildTemplateVars(customer, template.targetPlanId, siteUrl);
  const subject = applyTemplateVars(template.subjectTemplate, vars);
  const bodyInner = applyTemplateVars(template.bodyTemplate, vars);
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:24px;background:#f8f9fa;${GOOGLE_SANS_FONT_FAMILY_CSS};color:#202124;font-size:15px;line-height:1.55;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e8eaed;border-radius:8px;padding:24px;">
    ${bodyInner}
    <hr style="margin-top:28px;border:none;border-top:1px solid #e8eaed" />
    <p style="margin-top:16px;font-size:12px;color:#5f6368;">Market Intelligence · <a href="${vars.pricingUrl}" style="color:#5f6368;">Pricing</a></p>
  </div>
</body>
</html>`;
  return { subject, html };
}
