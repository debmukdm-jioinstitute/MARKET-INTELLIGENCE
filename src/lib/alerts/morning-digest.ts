/**
 * Morning alert digest, compresses each user's overnight-fired alert_events into one short
 * paragraph via summarizeItems (BART), instead of leaving them as a list of separate messages.
 * Runs as part of the existing alerts cron (see src/app/api/cron/alerts/route.ts); a failure here
 * never blocks rule evaluation itself.
 *
 * "One digest per user per IST day": persistent dedup in notify_state (survives deploys and
 * serverless instance churn), since the alerts cron runs every 3h.
 */

import { sql, hasDatabase } from "@/lib/db";
import { summarizeItems } from "@/lib/hf/summarizer";
import { sendNewsletter, hasOutboundEmailConfigured } from "@/lib/admin/email";
import { getState, setState } from "@/lib/notify/store";
import { attentionSectionHtml } from "@/lib/notify/smart/digest";

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
    // A single overnight alert is already its own notification, nothing to compress.
    if (messages.length < 2) continue;

    try {
      const digest = await summarizeItems(messages, 70).catch(() => messages.join(" "));
      // Smart layer: top-ranked events the user wasn't pushed, personalized.
      const attention = await attentionSectionHtml(userEmail).catch(() => "");
      if (hasOutboundEmailConfigured()) {
        const site = process.env.NEXT_PUBLIC_SITE_URL || "https://getmarketintelligence.in";
        const { renderMarketIntelligenceEmail } = await import("@/lib/email/market-intelligence-layout");
        await sendNewsletter(`Your overnight alert digest (${messages.length} alerts)`, [userEmail], () =>
          renderMarketIntelligenceEmail({
            badge: "ALERT DIGEST",
            title: `Overnight digest, ${messages.length} alerts`,
            contentHtml:
              `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#3c4043;">${digest.replace(/</g, "&lt;")}</p>` +
              attention,
            primaryCta: { label: "Manage alert rules →", href: `${site}/intelligence/alerts` },
            footnote: "Not investment advice.",
            siteUrl: site,
          }),
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
