import { Resend } from "resend";

export function hasEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Verified Resend subdomain (DNS: send → forge.rmta.net). Override with RESEND_FROM_EMAIL on Vercel. */
export const PRODUCTION_RESEND_FROM =
  "Market Intelligence <onboarding@send.getmarketintelligence.in>";

/** True while using Resend sandbox — delivers only to the Resend account owner email. */
export function isSandboxSender(): boolean {
  const from = getResendFromAddress();
  return from.includes("@resend.dev");
}

export function getResendFromAddress(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return PRODUCTION_RESEND_FROM;
  return "Market Intelligence <onboarding@resend.dev>";
}

export type EmailAttachment = { filename: string; content: Buffer | string };

/** Single transactional email (welcome, alerts, etc.). */
export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not configured." };
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: getResendFromAddress(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    replyTo: input.replyTo,
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: typeof a.content === "string" ? a.content : a.content,
    })),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type NewsletterSendResult = { sent: number; failed: number; errors: string[] };

/**
 * Sends one HTML email to each recipient via Resend's batch API (100 per call, per Resend's limit).
 * `htmlFor` builds the body per recipient (e.g. to inject a personalized unsubscribe link).
 *
 * A single bad/rejected recipient (e.g. sandbox-mode restrictions, malformed address) fails the
 * *entire* batch call as one Resend API error — so on error we fall back to sending that chunk's
 * recipients one at a time, isolating exactly which addresses failed and why instead of discarding
 * everyone in the chunk.
 */
export async function sendNewsletter(
  subject: string,
  recipients: string[],
  htmlFor: (email: string) => string,
): Promise<NewsletterSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
  const resend = new Resend(apiKey);
  const from = getResendFromAddress();

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    const { data, error } = await resend.batch.send(
      chunk.map((to) => ({ from, to, subject, html: htmlFor(to) })),
    );
    if (!error) {
      sent += data?.data?.length ?? chunk.length;
      continue;
    }

    // Batch call rejected as a whole — retry individually so one bad address doesn't sink the rest.
    for (const to of chunk) {
      const single = await resend.emails.send({ from, to, subject, html: htmlFor(to) });
      if (single.error) {
        failed += 1;
        errors.push(`${to}: ${single.error.message}`);
      } else {
        sent += 1;
      }
    }
  }

  return { sent, failed, errors: [...new Set(errors)] };
}
