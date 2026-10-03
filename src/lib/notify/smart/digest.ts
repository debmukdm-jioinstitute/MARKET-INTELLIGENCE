/**
 * Smart notifications — digest section.
 *
 * "Worth your attention": top-ranked smart events per user for the morning
 * digest. Personalized per recipient; only events not already pushed.
 */
import { hasDatabase, sql } from "@/lib/db";
import { getUserContext, relevanceFor } from "./relevance";
import { rankOf } from "./score";
import { ensureSmartSchema, type SmartEventRow } from "./schema";

const esc = (s: string) => s.replace(/</g, "&lt;");

/** HTML fragment for the digest email; empty string when nothing qualifies. */
export async function attentionSectionHtml(userEmail: string): Promise<string> {
  if (!hasDatabase()) return "";
  await ensureSmartSchema();
  const db = sql();
  const [ctx, prefs] = await Promise.all([
    getUserContext(userEmail),
    db`SELECT muted_categories FROM notification_prefs WHERE user_email = ${userEmail}`.then(
      (r) => (r[0] as { muted_categories: string[] } | undefined)?.muted_categories ?? [],
    ),
  ]);
  const muted = new Set(prefs);
  const pushedKeys = new Set(
    ((await db`SELECT e.key FROM notification_interactions i JOIN site_events e ON e.id = i.event_id
      WHERE i.user_email = ${userEmail} AND i.action = 'pushed'
        AND i.created_at > now() - interval '24 hours'`) as { key: string }[]).map((r) => r.key),
  );
  const events = (await db`
    SELECT id, key, at, category, severity, importance, symbol, title, body, href, why, source_url
    FROM site_events WHERE why <> '' AND at > now() - interval '24 hours'
    ORDER BY importance DESC LIMIT 60`) as SmartEventRow[];
  const now = new Date();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://getmarketintelligence.in";
  const top = events
    .filter((e) => !muted.has(e.category) && !pushedKeys.has(e.key))
    .map((e) => ({ e, rank: rankOf(Number(e.importance), relevanceFor(e, ctx), e.at, now) }))
    .filter((x) => x.rank * 100 >= 50)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 5);
  if (!top.length) return "";
  const items = top
    .map(({ e }) => `<li style="margin:0 0 8px"><a href="${site}${esc(e.href)}" style="color:#1a73e8;text-decoration:none"><strong>${esc(e.title)}</strong></a><br><span style="color:#5f6368">${esc(e.body.slice(0, 120))}</span></li>`)
    .join("");
  return `<h4 style="margin:16px 0 8px">Worth your attention</h4><ul style="padding-left:18px;margin:0">${items}</ul>`;
}
