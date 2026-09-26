import {
  getResendFromAddress,
  hasEmailConfigured,
  isSandboxSender,
  sendTransactionalEmail,
} from "@/lib/admin/email";
import type { SessionUser } from "@/lib/auth";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { defaultSiteUrl, loadOnboardingFormModelForUser } from "@/lib/onboarding/load-form-model";
import { renderOnboardingFormPdf } from "@/lib/onboarding/render-form-pdf";
import { renderWelcomeEmailHtml, welcomeEmailSubject } from "@/lib/onboarding/welcome-email";

const FOUNDER_EMAIL = "Deb@getmarketintelligence.in";

/** Records delivery so the backfill never emails the same member twice. Best effort. */
async function markWelcomeSent(email: string): Promise<void> {
  if (!hasDatabase()) return;
  try {
    await ensureSchema();
    await sql()`UPDATE users SET welcome_sent_at = now() WHERE email = ${email}`;
  } catch {
    /* tracking is best effort */
  }
}

/** Welcome email + onboarding PDF for new accounts. No-op if Resend missing. */
export async function sendWelcomePackToUser(user: SessionUser, origin?: string): Promise<void> {
  await sendWelcomePackWithResult(user, origin);
}

/** Same send, but reports the outcome (used by "email me a copy" on the profile page, incl. past users). */
export async function sendWelcomePackWithResult(user: SessionUser, origin?: string): Promise<{ ok: boolean; error?: string }> {
  if (user.guest) return { ok: false, error: "Sign in to receive your welcome pack." };
  if (!hasEmailConfigured()) return { ok: false, error: "Email is not configured on this deployment." };

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
    return { ok: false, error: result.error };
  }
  await markWelcomeSent(user.email);
  return { ok: true };
}
