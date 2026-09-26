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

export type WelcomePackSendResult = {
  ok: boolean;
  error?: string;
  resendId?: string;
  from?: string;
  /** False when the onboarding PDF was skipped after an attachment send failure. */
  pdfAttached?: boolean;
  pdfSkipReason?: string;
};

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

/** Same send, but reports the outcome (admin test, profile resend, backfill). */
export async function sendWelcomePackWithResult(user: SessionUser, origin?: string): Promise<WelcomePackSendResult> {
  const from = getResendFromAddress();
  if (user.guest) return { ok: false, error: "Sign in to receive your welcome pack.", from };
  if (!hasEmailConfigured()) {
    return { ok: false, error: "Email is not configured on this deployment.", from };
  }

  try {
    const siteUrl = defaultSiteUrl(origin);
    const model = await loadOnboardingFormModelForUser(user, siteUrl);
    const pdf = await renderOnboardingFormPdf(model);
    const firstName = user.name.split(/\s+/)[0] || "Friend";
    const subject = welcomeEmailSubject(firstName);
    const html = renderWelcomeEmailHtml(model);
    const safeId = model.customer.customerId.replace(/[^a-zA-Z0-9-_]/g, "_");

    const base = {
      to: user.email,
      subject,
      html,
      replyTo: FOUNDER_EMAIL,
    };

    const withPdf = await sendTransactionalEmail({
      ...base,
      attachments: [
        {
          filename: `market-intelligence-onboarding-${safeId}.pdf`,
          content: pdf,
        },
      ],
    });

    if (withPdf.ok) {
      await markWelcomeSent(user.email);
      return { ok: true, resendId: withPdf.id, from, pdfAttached: true };
    }

    const withoutPdf = await sendTransactionalEmail(base);
    if (withoutPdf.ok) {
      await markWelcomeSent(user.email);
      console.warn("[welcome-pack] PDF attachment failed; sent HTML only.", user.email, withPdf.error);
      return {
        ok: true,
        resendId: withoutPdf.id,
        from,
        pdfAttached: false,
        pdfSkipReason: withPdf.error,
      };
    }

    console.error(
      "[welcome-pack]",
      user.email,
      withoutPdf.error ?? withPdf.error,
      "from=",
      from,
      isSandboxSender() ? "(sandbox)" : "",
    );
    return { ok: false, error: withoutPdf.error ?? withPdf.error, from };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Welcome pack failed.";
    console.error("[welcome-pack]", user.email, message);
    return { ok: false, error: message, from };
  }
}
