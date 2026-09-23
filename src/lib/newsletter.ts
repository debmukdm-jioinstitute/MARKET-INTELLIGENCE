import crypto from "crypto";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";

function unsubscribeSecret(): string {
  return process.env.ADMIN_SYNC_SECRET || process.env.RESEND_API_KEY || "market-intelligence-newsletter";
}

/** Deterministic per-email token — lets an unsubscribe link work without a login. */
export function unsubscribeToken(email: string): string {
  return crypto.createHmac("sha256", unsubscribeSecret()).update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = unsubscribeToken(email);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(token || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function unsubscribeUrl(email: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://getmarketintelligence.vercel.app";
  const params = new URLSearchParams({ email, token: unsubscribeToken(email) });
  return `${base}/api/newsletter/unsubscribe?${params.toString()}`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Every current opted-in recipient: registered users (opt-out defaults to false) plus public subscribers, deduped. */
export async function getActiveRecipients(): Promise<string[]> {
  if (!hasDatabase()) return [];
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT email FROM users WHERE newsletter_opt_out = false
    UNION
    SELECT email FROM newsletter_subscribers WHERE status = 'subscribed'
  `) as { email: string }[];
  return rows.map((r) => r.email);
}

export async function getRecipientCount(): Promise<{ users: number; publicSubscribers: number; total: number }> {
  if (!hasDatabase()) return { users: 0, publicSubscribers: 0, total: 0 };
  await ensureSchema();
  const db = sql();
  const [users, subs, total] = await Promise.all([
    db`SELECT count(*)::int AS n FROM users WHERE newsletter_opt_out = false`,
    db`SELECT count(*)::int AS n FROM newsletter_subscribers WHERE status = 'subscribed'`,
    db`
      SELECT count(*)::int AS n FROM (
        SELECT email FROM users WHERE newsletter_opt_out = false
        UNION
        SELECT email FROM newsletter_subscribers WHERE status = 'subscribed'
      ) t
    `,
  ]);
  return { users: users[0].n, publicSubscribers: subs[0].n, total: total[0].n };
}

/** Appends a standard unsubscribe footer to a newsletter's HTML for one recipient. */
export function withUnsubscribeFooter(html: string, email: string): string {
  const url = unsubscribeUrl(email);
  return `${html}
<hr style="margin-top:32px;border:none;border-top:1px solid #e8eaed" />
<p style="margin-top:16px;font-size:12px;color:#5f6368;font-family:sans-serif">
  You're receiving this because you're subscribed to Market Intelligence updates.
  <a href="${url}" style="color:#5f6368;text-decoration:underline">Unsubscribe</a>
</p>`;
}
