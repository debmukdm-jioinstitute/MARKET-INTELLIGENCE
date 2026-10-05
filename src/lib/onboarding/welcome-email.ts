import type { OnboardingFormModel } from "@/lib/onboarding/build-form-model";
import { GOOGLE_SANS_FONT_FAMILY_CSS } from "@/lib/typography";

export const FOUNDER_NAME = "Debabrata Mukherjee";
export const FOUNDER_EMAIL = "Deb@getmarketintelligence.in";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function welcomeEmailSubject(firstName: string): string {
  return `${firstName}, welcome, a quick note from me`;
}

const PREHEADER = "Thanks for joining, here's where to start, in plain words";

/**
 * Plain-text-first founder letter. No banner images, no heavy layout, one
 * link, reads like a personal note so Gmail files it under Primary.
 */
export function renderWelcomeEmailHtml(model: OnboardingFormModel): string {
  const site = model.siteUrl.replace(/\/$/, "");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#ffffff;${GOOGLE_SANS_FONT_FAMILY_CSS};color:#202124;font-size:15px;line-height:1.7;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(PREHEADER)}</div>
  <div style="max-width:560px;margin:0 auto;padding:28px 20px;">
    <p style="margin:0 0 16px">Hi,</p>
    <p style="margin:0 0 16px">I'm Debabrata, I built Market Intelligence because I was tired of cluttered, expensive financial tools. I wanted one calm place where anyone, from a student to a seasoned trader, could see their money clearly.</p>
    <p style="margin:0 0 16px">A good place to start is the home page, it shows you today's market picture in plain words: <a href="${esc(site)}/Home" style="color:#1a5cff;">open your desk</a></p>
    <p style="margin:0 0 16px">Two honest notes: this is research and learning, not financial advice, and the site is young, so you will find bugs. If you do, just reply to this email and tell me. I read every one.</p>
    <p style="margin:0 0 16px">Thanks for being here early. It means a lot.</p>
    <p style="margin:24px 0 0">Debabrata<br/><span style="color:#5f6368;font-size:13px">Market Intelligence · made by Debabrata Mukherjee, Jio Institute</span></p>
  </div>
</body></html>`;
}

/** Plain-text twin of the welcome letter (sent as the multipart text part). */
export function renderWelcomeEmailText(model: OnboardingFormModel): string {
  const site = model.siteUrl.replace(/\/$/, "");
  return [
    "Hi,",
    "",
    "I'm Debabrata, I built Market Intelligence because I was tired of cluttered, expensive financial tools. I wanted one calm place where anyone, from a student to a seasoned trader, could see their money clearly.",
    "",
    `A good place to start is the home page, it shows you today's market picture in plain words: ${site}/Home`,
    "",
    "Two honest notes: this is research and learning, not financial advice, and the site is young, so you will find bugs. If you do, just reply to this email and tell me. I read every one.",
    "",
    "Thanks for being here early. It means a lot.",
    "",
    "Debabrata",
    "Market Intelligence · made by Debabrata Mukherjee, Jio Institute",
  ].join("\n");
}
