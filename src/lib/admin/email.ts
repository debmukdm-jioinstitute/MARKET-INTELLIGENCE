import { Resend } from "resend";

export function hasEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function fromAddress(): string {
  // onboarding@resend.dev works with zero setup (Resend's shared sandbox sender);
  // set RESEND_FROM_EMAIL once you've verified your own sending domain in Resend.
  return process.env.RESEND_FROM_EMAIL || "Market Intelligence <onboarding@resend.dev>";
}

export type NewsletterSendResult = { sent: number; failed: number; errors: string[] };

/**
 * Sends one HTML email to each recipient via Resend's batch API (100 per call, per Resend's limit).
 * `htmlFor` builds the body per recipient (e.g. to inject a personalized unsubscribe link).
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
    if (error) {
      failed += chunk.length;
      errors.push(error.message);
      continue;
    }
    sent += data?.data?.length ?? chunk.length;
  }

  return { sent, failed, errors };
}
