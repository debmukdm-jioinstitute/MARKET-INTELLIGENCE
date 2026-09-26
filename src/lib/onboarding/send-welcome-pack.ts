import {
  getResendFromAddress,
  hasEmailConfigured,
  isSandboxSender,
  sendTransactionalEmail,
} from "@/lib/admin/email";
import type { SessionUser } from "@/lib/auth";
import { defaultSiteUrl, loadOnboardingFormModelForUser } from "@/lib/onboarding/load-form-model";
import { renderOnboardingFormPdf } from "@/lib/onboarding/render-form-pdf";
import { renderWelcomeEmailHtml, welcomeEmailSubject } from "@/lib/onboarding/welcome-email";

const FOUNDER_EMAIL = "Deb@getmarketintelligence.in";

/** Welcome email + onboarding PDF for new accounts. No-op if Resend missing. */
export async function sendWelcomePackToUser(user: SessionUser, origin?: string): Promise<void> {
  if (user.guest || !hasEmailConfigured()) return;

  const siteUrl = defaultSiteUrl(origin);
  const model = await loadOnboardingFormModelForUser(user, siteUrl);
  const pdf = await renderOnboardingFormPdf(model);
  const firstName = user.name.split(/\s+/)[0] || "Friend";
  const subject = welcomeEmailSubject(firstName);
  const html = renderWelcomeEmailHtml(model);
  const safeId = model.customer.customerId.replace(/[^a-zA-Z0-9-_]/g, "_");

  const result = await sendTransactionalEmail({
    to: user.email,
    subject,
    html,
    replyTo: FOUNDER_EMAIL,
    attachments: [
      {
        filename: `market-intelligence-onboarding-${safeId}.pdf`,
        content: pdf,
      },
    ],
  });

  if (!result.ok) {
    console.error(
      "[welcome-pack]",
      user.email,
      result.error,
      "from=",
      getResendFromAddress(),
      isSandboxSender() ? "(sandbox)" : "",
    );
  }
}
