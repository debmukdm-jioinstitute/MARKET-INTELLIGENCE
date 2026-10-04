import {
  getResendFromAddress,
  hasEmailConfigured,
  isSandboxSender,
  sendTransactionalEmail,
} from "@/lib/admin/email";
import type { SessionUser } from "@/lib/auth";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { defaultSiteUrl, loadOnboardingFormModelForUser } from "@/lib/onboarding/load-form-model";
import { renderWelcomeEmailHtml, renderWelcomeEmailText, welcomeEmailSubject } from "@/lib/onboarding/welcome-email";

const FOUNDER_EMAIL = "Deb@getmarketintelligence.in";

export type WelcomePackSendResult = {
  ok: boolean;
  error?: string;
  resendId?: string;
  from?: string;
  /** Always false — onboarding PDF is not emailed; download from profile or /onboarding. */
  pdfAttached?: boolean;
  pdfSkipReason?: string;
};

/**
 * A personal-looking sender ("Debabrata Mukherjee <deb@…>") on the same verified
 * domain as the configured From — a person, not "onboarding@", reads as
 * correspondence to Gmail. Sandbox senders are left untouched.
 */
function personalFrom(configured: string): string {
  const domain = configured.match(/@([^>\s]+)>?\s*$/)?.[1];
  if (!domain || domain === "resend.dev") return configured;
  return `Debabrata Mukherjee <deb@${domain}>`;
}

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

/** Founder welcome email for new accounts (no PDF attachment). No-op if Resend missing. */
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
    const firstName = user.name.split(/\s+/)[0] || "Friend";
    const subject = welcomeEmailSubject(firstName);
    const html = renderWelcomeEmailHtml(model);

    const sent = await sendTransactionalEmail({
      to: user.email,
      subject,
      html,
      text: renderWelcomeEmailText(model),
      from: personalFrom(from),
      replyTo: FOUNDER_EMAIL,
    });

    if (sent.ok) {
      await markWelcomeSent(user.email);
      return { ok: true, resendId: sent.id, from, pdfAttached: false };
    }

    console.error(
      "[welcome-pack]",
      user.email,
      sent.error,
      "from=",
      from,
      isSandboxSender() ? "(sandbox)" : "",
    );
    return { ok: false, error: sent.error, from };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Welcome pack failed.";
    console.error("[welcome-pack]", user.email, message);
    return { ok: false, error: message, from };
  }
}
