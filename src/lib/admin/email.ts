import { Resend } from "resend";
import { stripEmDashes, stripEmDashesOpt } from "@/lib/email-copy";

export function hasEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Default production sender — use a domain verified in Resend (see docs/RESEND.md). Override with RESEND_FROM_EMAIL on Vercel.
 *  Display name is a real person (founder) — personal senders place better in Gmail Primary than brand names. */
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
  return "Debabrata Mukherjee <onboarding@resend.dev>";
}

/**
 * Gmail bulk-sender compliant unsubscribe headers. Pass the recipient's
 * one-click unsubscribe URL when one exists (newsletters, digests);
 * marketing mail without a per-recipient URL still gets the mailto form.
 */
export function listUnsubscribeHeaders(unsubscribeUrl?: string): Record<string, string> {
  const methods = ["<mailto:unsubscribe@getmarketintelligence.in?subject=unsubscribe>"];
  if (unsubscribeUrl) methods.push(`<${unsubscribeUrl}>`);
  return {
    "List-Unsubscribe": methods.join(", "),
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export type EmailAttachment = { filename: string; content: Buffer | string };

/** Single transactional email (welcome, alerts, etc.). */
export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative (multipart); improves inbox placement. */
  text?: string;
  /** Overrides the default From (must be on a Resend-verified domain). */
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  /** Extra headers (e.g. List-Unsubscribe) passed straight to Resend. */
  headers?: Record<string, string>;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not configured." };
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: input.from ?? getResendFromAddress(),
    to: input.to,
    subject: stripEmDashes(input.subject),
    html: stripEmDashes(input.html),
    text: stripEmDashesOpt(input.text),
    replyTo: input.replyTo,
    headers: input.headers,
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: typeof a.content === "string" ? a.content : a.content,
    })),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id };
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
  opts?: { headersFor?: (email: string) => Record<string, string> },
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
      chunk.map((to) => ({
        from,
        to,
        subject: stripEmDashes(subject),
        html: stripEmDashes(htmlFor(to)),
        headers: opts?.headersFor?.(to),
      })),
    );
    if (!error) {
      sent += data?.data?.length ?? chunk.length;
      continue;
    }

    // Batch call rejected as a whole — retry individually so one bad address doesn't sink the rest.
    for (const to of chunk) {
      const single = await resend.emails.send({
        from,
        to,
        subject: stripEmDashes(subject),
        html: stripEmDashes(htmlFor(to)),
        headers: opts?.headersFor?.(to),
      });
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
