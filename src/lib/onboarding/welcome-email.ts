import type { OnboardingFormModel } from "@/lib/onboarding/build-form-model";
import { GOOGLE_SANS_FONT_FAMILY_CSS } from "@/lib/typography";

export const FOUNDER_NAME = "Debabrata Mukherjee";
export const FOUNDER_EMAIL = "Deb@getmarketintelligence.in";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function welcomeEmailSubject(firstName: string): string {
  return `${firstName}, welcome to Market Intelligence — your desk is ready`;
}

/** Beta founder letter — matches landing “A note to our beta users” card. */
export function renderWelcomeEmailHtml(model: OnboardingFormModel): string {
  const site = model.siteUrl.replace(/\/$/, "");
  const founderSig = `${site}/founder.png`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f6f8fe;${GOOGLE_SANS_FONT_FAMILY_CSS}">
  <div style="max-width:680px;margin:0 auto;padding:32px 16px 48px">
    <div style="background:#ffffff;border:1px solid rgba(255,255,255,0.85);border-radius:36px;box-shadow:0 30px 70px -30px rgba(30,64,175,0.22);padding:clamp(28px,5vw,56px)">
      <div style="width:64px;height:64px;margin:0 auto 14px;border-radius:50%;background:#e4eeff;font-size:30px;line-height:64px;text-align:center">👋</div>
      <h1 style="margin:0;font-size:clamp(26px,4vw,34px);font-weight:600;line-height:1.12;letter-spacing:-0.02em;color:#0f172a;text-align:center">A note to our beta users</h1>
      <div style="max-width:560px;margin:28px auto 0;font-size:18px;line-height:1.85;color:#3c4043">
        <p style="margin:20px 0 0">Hey there,</p>
        <p style="margin:20px 0 0">I built Market Intelligence because I was tired of cluttered, expensive, and overwhelming financial tools. I wanted a space where anyone — whether you&apos;re a student, a new investor, or a seasoned trader — could see their money clearly, without the noise. 🎯</p>
        <p style="margin:20px 0 0">This platform is designed to give you the exact tools the professionals use, but wrapped in an interface that actually feels good to use. No hidden fees, no credit card required to start, and no confusing jargon. Just clean data, beautiful charts, and insights you can trust. 🚀</p>
        <p style="margin:20px 0 0">I&apos;m incredibly grateful you&apos;re here. If you ever have feedback, ideas, or just want to chat about the markets, my inbox is always open. Let&apos;s build a smarter financial future, together. 🙌 I know that there will be a lot of bugs, so in case you find any, please do mail me at <a href="mailto:${FOUNDER_EMAIL}" style="color:#1a5cff;font-weight:700;text-decoration:none">${FOUNDER_EMAIL}</a>.</p>
        <p style="margin:26px 0 0;font-size:18px;font-weight:700;color:#0f172a">Warmly,</p>
        <img src="${esc(founderSig)}" alt="Building Market Intelligence" width="300" style="display:block;margin-top:22px;width:300px;max-width:100%;height:auto;border:0;border-radius:14px" />
        <p style="margin:30px 0 0;padding-top:20px;border-top:1px solid #e6e9f2;font-size:15px;font-style:italic;line-height:1.6;color:#5f6368">Made with ❤️ by Debabrata Mukherjee from Jio Institute, Room no 507</p>
      </div>
    </div>
  </div>
</body></html>`;
}
