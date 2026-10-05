import {
  isResendQuotaError,
  markResendQuotaExhausted,
  preferKitOverResend,
  recordResendSend,
} from "@/lib/admin/email-quota";
import { isKitEmailConfigured, sendKitTransactionalEmail } from "@/lib/kit";
import { Resend } from "resend";
import { stripEmDashes, stripEmDashesOpt } from "@/lib/email-copy";

export type EmailProvider = "resend" | "kit";

export function hasEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** Resend and/or Kit can deliver outbound mail. */
export function hasOutboundEmailConfigured(): boolean {
  return hasEmailConfigured() || isKitEmailConfigured();
}

export async function activeEmailProvider(): Promise<EmailProvider | "none"> {
  if ((await preferKitOverResend()) && isKitEmailConfigured()) return "kit";
  if (hasEmailConfigured() && !productionEmailMisconfiguredReason()) return "resend";
  if (isKitEmailConfigured()) return "kit";
  return "none";
}

const FOUNDER_REPLY_TO = "Deb@getmarketintelligence.in";

const TRANSACTIONAL_DISPLAY_NAME = "Debabrata Mukherjee · Market Intelligence";

/** Keep the Resend-verified mailbox; only normalize display name (Outlook junked deb@ on send subdomain). */
export function deliverabilityFromAddress(configured: string): string {
  const trimmed = configured.trim();
  const angled = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  const addr = (angled?.[2] ?? trimmed).trim();
  if (!addr.includes("@")) return trimmed;
  if (addr.includes("@resend.dev")) return trimmed;
  return `${TRANSACTIONAL_DISPLAY_NAME} <${addr}>`;
}

/** @deprecated Use deliverabilityFromAddress — same verified address, no cross-domain deb@ From. */
export function personalFromAddress(configured: string): string {
  return deliverabilityFromAddress(configured);
}

/** Minimal HTML → plain text for multipart/alternative (Outlook prefers text+html). */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Exchange / Outlook: suppress auto-replies; do not mark bulk/marketing. */
export function transactionalMailHeaders(): Record<string, string> {
  return {
    "X-Auto-Response-Suppress": "OOF, DR, RN, NRN, AutoReply",
  };
}

function mergeHeaders(...parts: Array<Record<string, string> | undefined>): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const p of parts) {
    if (!p) continue;
    Object.assign(out, p);
  }
  return Object.keys(out).length ? out : undefined;
}

/** Block OTP / welcome sends when production still points at Resend sandbox. */
export function productionEmailMisconfiguredReason(): string | null {
  if (process.env.NODE_ENV !== "production") return null;
  if (!hasEmailConfigured()) return null;
  if (!isSandboxSender()) return null;
  return "Email sender is on Resend sandbox (onboarding@resend.dev). Set RESEND_FROM_EMAIL to your verified domain in Vercel — see docs/RESEND.md.";
}

/** Default production sender — use a domain verified in Resend (see docs/RESEND.md). Override with RESEND_FROM_EMAIL on Vercel.
 *  Display name is a real person (founder) — personal senders place better in Gmail Primary than brand names. */
/** Apex domain — DKIM live at resend._domainkey.getmarketintelligence.in (send.* subdomain DNS was removed). */
export const PRODUCTION_RESEND_FROM =
  "Debabrata Mukherjee · Market Intelligence <onboarding@getmarketintelligence.in>";

/** send.getmarketintelligence.in had dedicated Resend DNS; remap if env still points there. */
export function normalizeResendFromAddress(from: string): string {
  return from.replace(/@send\.getmarketintelligence\.in/gi, "@getmarketintelligence.in");
}

/** True while using Resend sandbox — delivers only to the Resend account owner email. */
export function isSandboxSender(): boolean {
  const from = getResendFromAddress();
  return from.includes("@resend.dev");
}

export function getResendFromAddress(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  if (configured) return normalizeResendFromAddress(configured);
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

export type SendEmailResult = { ok: boolean; error?: string; id?: string; provider?: EmailProvider };

async function sendViaResend(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  kind?: "transactional" | "marketing";
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not configured." };
  const resend = new Resend(apiKey);
  const fromRaw = input.from ?? getResendFromAddress();
  const from = deliverabilityFromAddress(fromRaw);
  const text = input.text ?? htmlToPlainText(input.html);
  const headers = mergeHeaders(
    input.kind === "marketing" ? undefined : transactionalMailHeaders(),
    input.headers,
  );
  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text,
    replyTo: input.replyTo ?? FOUNDER_REPLY_TO,
    headers,
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: typeof a.content === "string" ? a.content : a.content,
    })),
  });
  if (error) return { ok: false, error: error.message, provider: "resend" };
  if (!data?.id) {
    return { ok: false, error: "Resend accepted the request but did not return a message id.", provider: "resend" };
  }
  return { ok: true, id: data.id, provider: "resend" };
}

/** Single transactional email (welcome, alerts, etc.). Resend first; Kit when quota exhausted. */
export async function sendTransactionalEmail(rawInput: {
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
  /** Marketing adds List-Unsubscribe only via `headers`; default is account/OTP mail. */
  kind?: "transactional" | "marketing";
}): Promise<SendEmailResult> {
  // Policy: no em dashes in customer email (docs/EMAIL_STYLE.md).
  const input = {
    ...rawInput,
    subject: stripEmDashes(rawInput.subject),
    html: stripEmDashes(rawInput.html),
    text: stripEmDashesOpt(rawInput.text),
  };
  if (input.attachments?.length) {
    if (!(await preferKitOverResend()) && hasEmailConfigured()) {
      const r = await sendViaResend(input);
      if (r.ok) await recordResendSend(1);
      else if (isResendQuotaError(r.error)) await markResendQuotaExhausted();
      if (r.ok || !isKitEmailConfigured()) return r;
    }
    if (isKitEmailConfigured()) {
      console.warn("[email] Kit fallback cannot attach files — sending HTML only via Kit.");
      const kit = await sendKitTransactionalEmail({
        to: input.to,
        subject: input.subject,
        html: input.html,
        previewText: input.text ?? input.subject,
      });
      return kit.ok ? { ...kit, provider: "kit" } : { ...kit, provider: "kit" };
    }
    return { ok: false, error: "No email provider configured for attachments." };
  }

  const tryResend = hasEmailConfigured() && !(await preferKitOverResend()) && !productionEmailMisconfiguredReason();
  if (tryResend) {
    const r = await sendViaResend(input);
    if (r.ok) {
      await recordResendSend(1);
      return r;
    }
    if (isResendQuotaError(r.error)) await markResendQuotaExhausted();
    else if (!isKitEmailConfigured()) return r;
  }

  if (!isKitEmailConfigured()) {
    return { ok: false, error: tryResend ? "Resend failed and KIT_API_KEY is not set." : "RESEND_API_KEY is not configured." };
  }

  const kit = await sendKitTransactionalEmail({
    to: input.to,
    subject: input.subject,
    html: input.html,
    previewText: input.text ?? input.subject,
  });
  if (kit.ok) return { ...kit, provider: "kit" };

  if (hasEmailConfigured() && !productionEmailMisconfiguredReason()) {
    const retry = await sendViaResend(input);
    if (retry.ok) {
      await recordResendSend(1);
      return retry;
    }
  }
  return { ...kit, provider: "kit" };
}

export { FOUNDER_REPLY_TO };

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
  rawSubject: string,
  recipients: string[],
  rawHtmlFor: (email: string) => string,
  rawOpts?: {
    headersFor?: (email: string) => Record<string, string>;
    textFor?: (email: string) => string;
  },
): Promise<NewsletterSendResult> {
  // Policy: no em dashes in customer email (docs/EMAIL_STYLE.md).
  const subject = stripEmDashes(rawSubject);
  const htmlFor = (email: string) => stripEmDashes(rawHtmlFor(email));
  const opts = rawOpts && {
    ...rawOpts,
    textFor: rawOpts.textFor && ((email: string) => stripEmDashes(rawOpts.textFor!(email))),
  };
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  const useKit =
    ((await preferKitOverResend()) && isKitEmailConfigured()) ||
    (!hasEmailConfigured() && isKitEmailConfigured()) ||
    (Boolean(productionEmailMisconfiguredReason()) && isKitEmailConfigured());
  if (useKit) {
    if (!isKitEmailConfigured()) {
      throw new Error("Resend quota exhausted and KIT_API_KEY is not configured.");
    }
    for (const to of recipients) {
      const html = htmlFor(to);
      const kit = await sendKitTransactionalEmail({
        to,
        subject,
        html,
        previewText: opts?.textFor?.(to) ?? htmlToPlainText(html),
      });
      if (kit.ok) sent += 1;
      else {
        failed += 1;
        errors.push(`${to}: ${kit.error ?? "Kit send failed"}`);
      }
    }
    return { sent, failed, errors: [...new Set(errors)] };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
  const resend = new Resend(apiKey);
  const from = deliverabilityFromAddress(getResendFromAddress());

  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    const { data, error } = await resend.batch.send(
      chunk.map((to) => {
        const html = htmlFor(to);
        return {
          from,
          to,
          subject,
          html,
          text: opts?.textFor?.(to) ?? htmlToPlainText(html),
          replyTo: FOUNDER_REPLY_TO,
          headers: opts?.headersFor?.(to),
        };
      }),
    );
    if (!error) {
      const n = data?.data?.length ?? chunk.length;
      sent += n;
      await recordResendSend(n);
      continue;
    }

    if (isResendQuotaError(error.message)) {
      await markResendQuotaExhausted();
      if (isKitEmailConfigured()) {
        for (const to of recipients.slice(i)) {
          const html = htmlFor(to);
          const kit = await sendKitTransactionalEmail({
            to,
            subject,
            html,
            previewText: opts?.textFor?.(to) ?? htmlToPlainText(html),
          });
          if (kit.ok) sent += 1;
          else {
            failed += 1;
            errors.push(`${to}: ${kit.error ?? "Kit send failed"}`);
          }
        }
        return { sent, failed, errors: [...new Set(errors)] };
      }
    }

    // Batch call rejected as a whole — retry individually so one bad address doesn't sink the rest.
    for (const to of chunk) {
      const html = htmlFor(to);
      const single = await resend.emails.send({
        from,
        to,
        subject,
        html,
        text: opts?.textFor?.(to) ?? htmlToPlainText(html),
        replyTo: FOUNDER_REPLY_TO,
        headers: opts?.headersFor?.(to),
      });
      if (single.error) {
        if (isResendQuotaError(single.error.message)) {
          await markResendQuotaExhausted();
          if (isKitEmailConfigured()) {
            for (const rest of recipients.slice(recipients.indexOf(to))) {
              const h = htmlFor(rest);
              const kit = await sendKitTransactionalEmail({
                to: rest,
                subject,
                html: h,
                previewText: opts?.textFor?.(rest) ?? htmlToPlainText(h),
              });
              if (kit.ok) sent += 1;
              else {
                failed += 1;
                errors.push(`${rest}: ${kit.error ?? "Kit send failed"}`);
              }
            }
            return { sent, failed, errors: [...new Set(errors)] };
          }
        }
        failed += 1;
        errors.push(`${to}: ${single.error.message}`);
      } else {
        sent += 1;
        await recordResendSend(1);
      }
    }
  }

  return { sent, failed, errors: [...new Set(errors)] };
}
