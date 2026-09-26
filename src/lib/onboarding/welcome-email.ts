import type { OnboardingFormModel } from "@/lib/onboarding/build-form-model";
import { START_HERE } from "@/lib/nav-columns";
import { GOOGLE_SANS_FONT_FAMILY_CSS } from "@/lib/typography";

const FOUNDER_NAME = "Debabrata Mukherjee";
const FOUNDER_EMAIL = "Deb@getmarketintelligence.in";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function welcomeEmailSubject(firstName: string): string {
  return `${firstName}, welcome to Market Intelligence — your desk is ready`;
}

export function renderWelcomeEmailHtml(model: OnboardingFormModel): string {
  const firstName = model.customer.name.split(/\s+/)[0] || "there";
  const site = model.siteUrl;
  const features = START_HERE.map(
    (s) =>
      `<tr><td style="padding:14px 16px;border-bottom:1px solid #e8eaed;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#1a73e8">${esc(s.label)}</div>
        <div style="font-size:15px;font-weight:600;color:#202124;margin-top:4px">${esc(s.cta)}</div>
        <a href="${site}${esc(s.href)}" style="font-size:13px;color:#1a73e8;text-decoration:none">Open in terminal →</a>
      </td></tr>`,
  ).join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f6f8fc;${GOOGLE_SANS_FONT_FAMILY_CSS}">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px 40px">
    <div style="background:#ffffff;border:1px solid #e8eaed;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
      <div style="background:#1a73e8;padding:20px 24px">
        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,0.85)">Market Intelligence</p>
        <h1 style="margin:8px 0 0;font-size:22px;font-weight:600;color:#ffffff;line-height:1.3">Welcome, ${esc(firstName)}.</h1>
      </div>
      <div style="padding:24px">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#202124">
          I'm <strong>${FOUNDER_NAME}</strong>, founder of Market Intelligence. Thank you for trusting us with your investing journey — that means more than you know.
        </p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#3c4043">
          We built this because institutional-grade research shouldn't live behind paywalls and jargon. Our hustle is simple: <strong>help every Indian investor see markets clearly</strong> — live data, honest risk, AI where it helps, and zero ads cluttering your desk.
        </p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#3c4043">
          Your account (<span style="color:#1a73e8;font-weight:600">${esc(model.customer.customerId)}</span>) is live. Attached is your <strong>Customer Onboarding Form</strong> (PDF) — every feature and service on your plan, plus disclaimers. It updates automatically when we ship new modules; you can always regenerate it from <a href="${site}/onboarding" style="color:#1a73e8">your onboarding page</a>.
        </p>
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#5f6368">Start here</p>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e8eaed;border-radius:12px;overflow:hidden">${features}</table>
        <p style="margin:24px 0 0;text-align:center">
          <a href="${site}/Home" style="display:inline-block;background:#1a73e8;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:999px">Open your terminal</a>
        </p>
        <p style="margin:24px 0 0;font-size:14px;line-height:1.65;color:#3c4043">
          Beta will be messy — bugs happen. If something breaks or you have an idea, reply to this email or write me at
          <a href="mailto:${FOUNDER_EMAIL}" style="color:#1a73e8">${FOUNDER_EMAIL}</a>. Let's build a smarter financial future, together.
        </p>
        <p style="margin:16px 0 0;font-size:14px;color:#202124">With gratitude,<br/><strong>${FOUNDER_NAME}</strong><br/><span style="color:#5f6368">Founder, Market Intelligence</span></p>
      </div>
      <div style="padding:16px 24px;background:#f8f9fa;border-top:1px solid #e8eaed;font-size:11px;line-height:1.5;color:#5f6368">
        Educational tool only — not investment advice. <a href="${site}/privacy" style="color:#1a73e8">Privacy</a> · <a href="${site}/terms" style="color:#1a73e8">Terms</a>
      </div>
    </div>
  </div>
</body></html>`;
}
