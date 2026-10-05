import type { OnboardingFormModel } from "@/lib/onboarding/build-form-model";
import { miEmailParagraph, renderMarketIntelligenceEmail } from "@/lib/email/market-intelligence-layout";

export const FOUNDER_NAME = "Debabrata Mukherjee";
export const FOUNDER_EMAIL = "Deb@getmarketintelligence.in";

export function welcomeEmailSubject(firstName: string): string {
  return `${firstName}, welcome, a quick note from me`;
}

const PREHEADER = "Thanks for joining, here's where to start, in plain words";

export function renderWelcomeEmailHtml(model: OnboardingFormModel): string {
  const site = model.siteUrl.replace(/\/$/, "");

  return renderMarketIntelligenceEmail({
    preheader: PREHEADER,
    badge: "WELCOME",
    title: "Thanks for joining Market Intelligence.",
    greeting: "Hi,",
    bodyHtml:
      miEmailParagraph(
        "I'm Debabrata, I built Market Intelligence because I was tired of cluttered, expensive financial tools. I wanted one calm place where anyone, from a student to a seasoned trader, could see their money clearly.",
      ) +
      miEmailParagraph(
        `A good place to start is the home page, it shows you today's market picture in plain words.`,
      ) +
      miEmailParagraph(
        "Two honest notes: this is research and learning, not financial advice, and the site is young, so you will find bugs. If you do, just reply to this email and tell me. I read every one.",
      ) +
      miEmailParagraph("Thanks for being here early. It means a lot."),
    primaryCta: { label: "Open your dashboard →", href: `${site}/Home` },
    secondaryCta: { label: "View plans", href: `${site}/pricing` },
    siteUrl: site,
  });
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
    "Founder, Market Intelligence",
    site.replace(/^https?:\/\//, ""),
  ].join("\n");
}
