/**
 * Morning alert digest — compresses each user's overnight-fired alert_events into one short
 * paragraph via summarizeItems (BART), instead of leaving them as a list of separate messages.
 * Runs as part of the existing alerts cron (see src/app/api/cron/alerts/route.ts); a failure here
 * never blocks rule evaluation itself.
 *
 * "Cache per user per day": an in-process TTL cache keyed by user email, since the alerts cron
 * already runs every 3h — this keeps each user to at most one digest per ~20h window without a
 * schema change. Resets on deploy/restart (known limitation of an in-memory cache, not a DB one).
 */

import { sql, hasDatabase } from "@/lib/db";
import { summarizeItems } from "@/lib/hf/summarizer";
import { sendNewsletter, hasEmailConfigured } from "@/lib/admin/email";
import { GOOGLE_SANS_FONT_FAMILY_CSS } from "@/lib/typography";

const DIGEST_TTL_MS = 20 * 60 * 60 * 1000;
const lastDigestedAt = new Map<string, number>();

type UserAlertRow = { user_email: string; message: string };

export async function sendMorningAlertDigests(): Promise<{ usersDigested: number; eventsCompressed: number }> {
  if (!hasDatabase()) return { usersDigested: 0, eventsCompressed: 0 };

  const db = sql();
  const since = new Date(Date.now() - 12 * 3_600_000).toISOString();
  const rows = (await db`
    SELECT user_email, message FROM alert_events
    WHERE created_at >= ${since}
    ORDER BY user_email, created_at
  `) as UserAlertRow[];
  if (rows.length === 0) return { usersDigested: 0, eventsCompressed: 0 };

  const byUser = new Map<string, string[]>();
  for (const r of rows) {
    if (!byUser.has(r.user_email)) byUser.set(r.user_email, []);
    byUser.get(r.user_email)!.push(r.message);
  }

  let usersDigested = 0;
  let eventsCompressed = 0;

  for (const [userEmail, messages] of byUser) {
    const last = lastDigestedAt.get(userEmail);
    if (last && Date.now() - last < DIGEST_TTL_MS) continue;
    // A single overnight alert is already its own notification — nothing to compress.
    if (messages.length < 2) continue;

    try {
      const digest = await summarizeItems(messages, 70).catch(() => messages.join(" "));
      if (hasEmailConfigured()) {
        await sendNewsletter(`Your overnight alert digest (${messages.length} alerts)`, [userEmail], () =>
          `<div style="${GOOGLE_SANS_FONT_FAMILY_CSS};max-width:520px;padding:16px">` +
            `<h3 style="margin:0 0 8px">Overnight digest — ${messages.length} alerts</h3>` +
            `<p style="font-size:14px">${digest.replace(/</g, "&lt;")}</p>` +
            `<p style="font-size:12px;color:#5f6368">Manage rules at ${process.env.NEXT_PUBLIC_SITE_URL || "https://getmarketintelligence.vercel.app"}/intelligence/alerts. Not investment advice.</p>` +
          `</div>`,
        ).catch(() => ({ sent: 0 }));
      }
      lastDigestedAt.set(userEmail, Date.now());
      usersDigested++;
      eventsCompressed += messages.length;
    } catch {
      // One user's digest failing must not block the rest.
    }
  }

  return { usersDigested, eventsCompressed };
}
