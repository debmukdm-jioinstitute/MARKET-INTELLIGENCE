import { NextResponse } from "next/server";
import { hasDatabase, sql } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { ensureSmartSchema, type SmartEventRow } from "@/lib/notify/smart/schema";
import { getUserContext, relevanceFor } from "@/lib/notify/smart/relevance";
import { rankOf, tierOf } from "@/lib/notify/smart/score";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications/smart → personalized ranked feed ("For you").
 * Signed-in users get portfolio/behavior-aware ranking; guests get importance-ranked global events.
 */
export async function GET() {
  if (!hasDatabase()) return NextResponse.json({ events: [], personal: false });
  await ensureSmartSchema();
  const db = sql();
  const user = await getSessionUser().catch(() => null);
  const email = user && !user.guest ? user.email : null;
  const ctx = await getUserContext(email);

  // Respect muted categories + frequency for signed-in users.
  let muted: string[] = [];
  let frequency = "important";
  if (email) {
    const p = (await db`SELECT muted_categories, frequency FROM notification_prefs WHERE user_email = ${email}`) as {
      muted_categories: string[]; frequency: string;
    }[];
    if (p[0]) { muted = p[0].muted_categories ?? []; frequency = p[0].frequency ?? "important"; }
  }

  const events = (await db`
    SELECT id, key, at, category, severity, importance, symbol, title, body, href, why, source_url
    FROM site_events WHERE why <> '' AND at > now() - interval '7 days'
    ORDER BY at DESC LIMIT 120`) as SmartEventRow[];

  const now = new Date();
  const ranked = events
    .filter((e) => !muted.includes(e.category))
    .map((e) => {
      const rel = relevanceFor(e, ctx);
      const rank = rankOf(Number(e.importance), rel, e.at, now);
      return { ...e, relevance: rel, rank, tier: tierOf(Number(e.importance)) };
    })
    .filter((x) => (frequency === "all" ? true : x.rank * 100 >= 40 || x.relevance >= 0.6))
    .sort((a, b) => b.rank - a.rank || Number(b.importance) - Number(a.importance))
    .slice(0, 40);

  return NextResponse.json(
    { events: ranked, personal: !!email, serverTime: now.toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
