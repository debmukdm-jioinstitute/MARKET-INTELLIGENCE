/**
 * Telegram morning digest (free Zapier replacement).
 *
 * Once per IST day, sends the owner's Telegram chats a compressed summary of what moved
 * overnight: new high/medium site events (the same content as the in-app notification bell)
 * plus a count of fired user alert rules. Runs inside the existing 3-hourly alerts cron
 * (src/app/api/cron/alerts/route.ts) — the 08:30 IST run lands pre-market, and the
 * persistent once-per-day dedup below makes the exact run irrelevant.
 *
 * Honesty contract: sends nothing when there is nothing new. Never invents content —
 * the summary is compressed from real events via summarizeItems (BART), with a plain
 * join fallback. Requires TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID(S) (see
 * src/lib/notify/telegram.ts for setup); unconfigured → silent no-op.
 */

import { hasDatabase, sql } from "@/lib/db";
import { summarizeItems } from "@/lib/hf/summarizer";
import { getState, setState } from "@/lib/notify/store";
import { broadcastTelegram, hasTelegramConfigured, siteUrl } from "@/lib/notify/telegram";

const istDay = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

type EventRow = { title: string; body: string; href: string; category: string };

export async function sendTelegramDigest(): Promise<{ sent: boolean; events: number; chats: number }> {
  const none = { sent: false, events: 0, chats: 0 };
  if (!hasDatabase() || !hasTelegramConfigured()) return none;

  // Persistent once-per-IST-day dedup (survives deploys/restarts, unlike an in-process cache).
  const day = istDay();
  const prev = await getState<{ day: string }>("telegram_digest");
  if (prev?.day === day) return none;

  const db = sql();
  const since = new Date(Date.now() - 12 * 3_600_000).toISOString();
  let events: EventRow[] = [];
  let firedAlerts = 0;
  try {
    events = (await db`
      SELECT title, body, href, category FROM site_events
      WHERE at >= ${since} AND severity IN ('high', 'medium')
      ORDER BY at DESC LIMIT 15
    `) as EventRow[];
    const ar = (await db`
      SELECT count(*)::int AS n FROM alert_events WHERE fired_at >= ${since}
    `) as { n: number }[];
    firedAlerts = ar[0]?.n ?? 0;
  } catch {
    return none; // never send a digest we cannot back with real data
  }
  if (events.length === 0 && firedAlerts === 0) return none;

  const lines = events.map((e) => `${e.title} — ${e.body}`);
  if (firedAlerts > 0) lines.push(`${firedAlerts} user alert rule${firedAlerts === 1 ? "" : "s"} fired overnight.`);
  const summary = await summarizeItems(lines, 90).catch(() => lines.join(" "));
  const message =
    `\u2600\uFE0F Morning digest — ${day} (IST)\n` +
    `${summary}\n\n` +
    `Details: ${siteUrl()}/ — not investment advice.`;

  const r = await broadcastTelegram(message).catch(() => ({ sent: 0, failed: 0 }));
  if (r.sent > 0) {
    await setState("telegram_digest", { day });
    return { sent: true, events: events.length, chats: r.sent };
  }
  return none;
}
