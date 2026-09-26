import { hasDatabase, sql } from "../db";
import { hasPushConfigured, sendPush } from "../admin/push";
import { addEvents, deletePushSubscription, getState, listPushTargets, setState, type PushTarget } from "./store";
import type { NewEvent } from "./types";

/** At most this many broadcast device alerts per IST day, whatever happens — a runaway detector must not spam everyone. */
const DAILY_PUSH_CAP = 6;
const CONCURRENCY = 20;

const ist = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

/** Devices that should receive an event: everyone subscribed except those who muted its category. */
export function selectRecipients(targets: PushTarget[], category: string): PushTarget[] {
  return targets.filter((t) => !t.muted.includes(category));
}

/** Sends one "Important" event to every subscribed device (honouring per-device mutes) and prunes dead subscriptions. */
async function broadcast(e: NewEvent): Promise<{ sent: number; failed: number }> {
  const targets = selectRecipients(await listPushTargets(), e.category);
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const results = await Promise.all(
      targets.slice(i, i + CONCURRENCY).map(async (t) => {
        const r = await sendPush(t, { title: e.title, body: e.body, url: e.href });
        if (r.expired) await deletePushSubscription(t.endpoint).catch(() => {});
        return r.ok;
      }),
    );
    for (const ok of results) {
      if (ok) sent++;
      else failed++;
    }
  }
  if (hasDatabase()) {
    await sql()`INSERT INTO notifications_sent (title, body, url, recipient_count, failure_count) VALUES (${e.title}, ${e.body}, ${e.href}, ${sent}, ${failed})`.catch(() => {});
  }
  return { sent, failed };
}

/**
 * Adds events to the feed and, for genuinely new "Important" ones, sends a device alert to all subscribers.
 * Only events that were NEW to the feed are pushed, so a repeated detection can never re-notify anyone.
 */
export async function publishEvents(events: NewEvent[]): Promise<number> {
  const added = await addEvents(events);
  const important = added.filter((e) => e.severity === "high");
  if (important.length && hasPushConfigured() && hasDatabase()) {
    const day = ist();
    const counter = await getState<{ day: string; n: number }>("push_count");
    let n = counter?.day === day ? counter.n : 0;
    for (const e of important) {
      if (n >= DAILY_PUSH_CAP) break;
      n++;
      await broadcast(e).catch(() => {});
    }
    await setState("push_count", { day, n });
  }
  return added.length;
}
