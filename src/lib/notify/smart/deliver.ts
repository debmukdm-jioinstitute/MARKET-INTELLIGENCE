/**
 * Smart notifications — delivery engine.
 *
 * Runs detectors, scores + personalizes, then delivers per the governance rules:
 *   - push only for critical (importance ≥ 80) + relevant (≥ 0.6) events
 *   - max N pushes/day/user (default 3), quiet hours 22:00–08:00 IST
 *   - dedupe: one push per (user, event key) ever; 24h cooldown per symbol+category
 *   - everything placed in the bell is recorded as 'shown' for learning
 *
 * Called from POST /api/cron/smart-notify (CRON_SECRET-guarded), which the
 * GitHub Actions workflow hits every 30 minutes. Push credentials (VAPID) live
 * on Vercel, so delivery runs here — not on the Actions runner.
 */
import { hasDatabase, sql } from "@/lib/db";
import { hasPushConfigured, sendPush, type PushSubscriptionRow } from "@/lib/admin/push";
import { runAllDetectors } from "./detectors";
import { rankOf, tierOf, TIER_CRITICAL } from "./score";
import { getUserContext, inQuietHours, relevanceFor } from "./relevance";
import { ensureSmartSchema, upsertSmartEvents, type SmartEventRow } from "./schema";

export interface DeliveryReport {
  detected: number;
  added: number;
  users: number;
  pushed: number;
  bellPlaced: number;
  skippedQuietHours: number;
  skippedBudget: number;
}

interface Prefs {
  frequency: "all" | "important" | "digest";
  muted_categories: string[];
  quiet_start: number;
  quiet_end: number;
  max_push_per_day: number;
}

const DEFAULT_PREFS: Prefs = {
  frequency: "important", muted_categories: [], quiet_start: 22, quiet_end: 8, max_push_per_day: 3,
};

async function getPrefs(email: string): Promise<Prefs> {
  const db = sql();
  const rows = (await db`SELECT frequency, muted_categories, quiet_start, quiet_end, max_push_per_day
    FROM notification_prefs WHERE user_email = ${email}`) as Prefs[];
  return rows[0] ?? DEFAULT_PREFS;
}

export async function runSmartDelivery(): Promise<DeliveryReport> {
  const report: DeliveryReport = { detected: 0, added: 0, users: 0, pushed: 0, bellPlaced: 0, skippedQuietHours: 0, skippedBudget: 0 };
  if (!hasDatabase()) return report;
  await ensureSmartSchema();
  const db = sql();

  // 1. Detect + persist (dedupe by key). sql() is itself a template-tag query fn.
  const query = (strings: TemplateStringsArray, ...values: unknown[]) =>
    sql()(strings, ...values) as Promise<Record<string, unknown>[]>;
  const detected = await runAllDetectors({ query });
  report.detected = detected.length;
  const added = await upsertSmartEvents(detected);
  report.added = added.length;

  // 2. Candidate events: last 24h, ranked globally (personal rank computed per user).
  const events = (await db`
    SELECT id, key, at, category, severity, importance, symbol, title, body, href, why, source_url
    FROM site_events WHERE why <> '' AND at > now() - interval '24 hours'
    ORDER BY importance DESC, at DESC LIMIT 200`) as SmartEventRow[];
  if (!events.length) return report;

  // 3. Candidate users: anyone with push subs, prefs, or holdings (cap for safety).
  const users = (await db`
    SELECT DISTINCT user_email AS email FROM (
      SELECT user_email FROM push_subscriptions
      UNION SELECT user_email FROM notification_prefs
      UNION SELECT user_email FROM portfolio_holdings
    ) u LIMIT 5000`) as { email: string }[];
  report.users = users.length;

  const pushOk = hasPushConfigured();
  const now = new Date();

  for (const { email } of users) {
    if (!email) continue;
    const [prefs, ctx] = await Promise.all([getPrefs(email), getUserContext(email)]);
    const muted = new Set(prefs.muted_categories ?? []);
    const quiet = inQuietHours(prefs.quiet_start, prefs.quiet_end, now);

    // Rank + filter.
    const ranked = events
      .filter((e) => !muted.has(e.category))
      .map((e) => ({ e, rel: relevanceFor(e, ctx), rank: rankOf(Number(e.importance), relevanceFor(e, ctx), e.at, now) }))
      .filter((x) => (prefs.frequency === "all" ? true : x.rank * 100 >= 50 || x.rel >= 0.6))
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 30);
    if (!ranked.length) continue;

    // Record 'shown' for bell placement (learning signal).
    for (const { e } of ranked) {
      await db`INSERT INTO notification_interactions (user_email, event_id, action)
        VALUES (${email}, ${e.id}, 'shown')
        ON CONFLICT DO NOTHING`.catch(() => {});
      report.bellPlaced++;
    }

    // Push: critical + relevant only, within budget and quiet hours.
    if (!pushOk || quiet || prefs.frequency === "digest") {
      if (quiet) report.skippedQuietHours++;
      continue;
    }
    const pushCandidates = ranked.filter(
      ({ e, rel }) => Number(e.importance) >= TIER_CRITICAL && rel >= 0.6 && tierOf(Number(e.importance)) === "critical",
    );
    if (!pushCandidates.length) continue;

    const today = (await db`SELECT COUNT(*) AS c FROM notification_interactions
      WHERE user_email = ${email} AND action = 'pushed' AND created_at > now() - interval '24 hours'`) as { c: string }[];
    const used = Number(today[0]?.c ?? 0);
    const budget = Math.max(0, prefs.max_push_per_day - used);
    if (budget <= 0) { report.skippedBudget++; continue; }

    const alreadyPushed = new Set(
      ((await db`SELECT e.key FROM notification_interactions i JOIN site_events e ON e.id = i.event_id
        WHERE i.user_email = ${email} AND i.action = 'pushed'`) as { key: string }[]).map((r) => r.key),
    );
    const subs = (await db`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_email = ${email}`) as PushSubscriptionRow[];
    if (!subs.length) continue;

    for (const { e } of pushCandidates.slice(0, budget)) {
      if (alreadyPushed.has(e.key)) continue;
      // 24h cooldown per symbol+category.
      const cd = (await db`SELECT 1 FROM notification_interactions i JOIN site_events e2 ON e2.id = i.event_id
        WHERE i.user_email = ${email} AND i.action = 'pushed'
          AND e2.symbol = ${e.symbol} AND e2.category = ${e.category}
          AND i.created_at > now() - interval '24 hours' LIMIT 1`) as unknown[];
      if (cd.length) continue;
      for (const sub of subs) {
        const r = await sendPush(sub, { title: e.title, body: e.body.slice(0, 120), url: e.href });
        if (r.expired) await db`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`.catch(() => {});
      }
      await db`INSERT INTO notification_interactions (user_email, event_id, action) VALUES (${email}, ${e.id}, 'pushed')`.catch(() => {});
      report.pushed++;
    }
  }
  return report;
}
