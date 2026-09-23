import { Resend } from "resend";

export function hasEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** True while sending from Resend's shared sandbox sender — it can only deliver to the Resend account's own email until a domain is verified. */
export function isSandboxSender(): boolean {
  return !process.env.RESEND_FROM_EMAIL;
}

function fromAddress(): string {
  // onboarding@resend.dev works with zero setup (Resend's shared sandbox sender), but Resend
  // will then refuse to deliver to anyone except the account's own signup email — see isSandboxSender().
  // Set RESEND_FROM_EMAIL once you've verified your own sending domain in Resend to lift that limit.
  return process.env.RESEND_FROM_EMAIL || "Market Intelligence <onboarding@resend.dev>";
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
  const from = fromAddress();

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
