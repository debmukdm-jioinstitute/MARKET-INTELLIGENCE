/**
 * Morning alert digest — compresses each user's overnight-fired alert_events into one short
 * paragraph via summarizeItems (BART), instead of leaving them as a list of separate messages.
 * Runs as part of the existing alerts cron (see src/app/api/cron/alerts/route.ts); a failure here
 * never blocks rule evaluation itself.
 *
 * "One digest per user per IST day": persistent dedup in notify_state (survives deploys and
 * serverless instance churn), since the alerts cron runs every 3h.
 */

import { sql, hasDatabase } from "@/lib/db";
import { summarizeItems } from "@/lib/hf/summarizer";
import { sendNewsletter, hasEmailConfigured } from "@/lib/admin/email";
import { getState, setState } from "@/lib/notify/store";
import { attentionSectionHtml } from "@/lib/notify/smart/digest";
import { GOOGLE_SANS_FONT_FAMILY_CSS } from "@/lib/typography";

const istDay = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

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
    // Persistent once-per-IST-day dedup (was an in-process Map that reset on deploy).
    const day = istDay();
    const prev = await getState<{ day: string }>(`digest:${userEmail}`).catch(() => null);
    if (prev?.day === day) continue;
    // A single overnight alert is already its own notification — nothing to compress.
    if (messages.length < 2) continue;

    try {
      const digest = await summarizeItems(messages, 70).catch(() => messages.join(" "));
      // Smart layer: top-ranked events the user wasn't pushed, personalized.
      const attention = await attentionSectionHtml(userEmail).catch(() => "");
      if (hasEmailConfigured()) {
        await sendNewsletter(`Your overnight alert digest (${messages.length} alerts)`, [userEmail], () =>
          `<div style="${GOOGLE_SANS_FONT_FAMILY_CSS};max-width:520px;padding:16px">` +
            `<h3 style="margin:0 0 8px">Overnight digest — ${messages.length} alerts</h3>` +
            `<p style="font-size:14px">${digest.replace(/</g, "&lt;")}</p>` +
            attention +
            `<p style="font-size:12px;color:#5f6368">Manage rules at ${process.env.NEXT_PUBLIC_SITE_URL || "https://getmarketintelligence.vercel.app"}/intelligence/alerts. Not investment advice.</p>` +
          `</div>`,
        ).catch(() => ({ sent: 0 }));
      }
      await setState(`digest:${userEmail}`, { day }).catch(() => {});
      usersDigested++;
      eventsCompressed += messages.length;
    } catch {
      // One user's digest failing must not block the rest.
    }
  }

  return { usersDigested, eventsCompressed };
}
