import { sql } from "@/lib/db";
import { XP_CATALOG, levelFor, levelProgress } from "./catalog";

export interface AwardResult {
  awarded: boolean;
  points: number;
  total: number;
  level: string;
}

export interface ActionSummary {
  action: string;
  label: string;
  count: number;
  points: number;
}

export interface RecentEvent {
  action: string;
  label: string;
  points: number;
  created_at: string;
}

export interface XpSummary {
  total: number;
  level: string;
  nextLevel: string | null;
  progressPct: number;
  byAction: ActionSummary[];
  recent: RecentEvent[];
}

async function totalFor(email: string): Promise<number> {
  const db = sql();
  const [{ total }] = (await db`
    SELECT COALESCE(SUM(points), 0)::int AS total FROM xp_events WHERE user_email = ${email}
  `) as { total: number }[];
  return total;
}

async function alreadyAwarded(email: string, action: string): Promise<boolean> {
  const db = sql();
  const freq = XP_CATALOG[action].frequency;
  if (freq === "once") {
    const rows = (await db`
      SELECT 1 AS one FROM xp_events WHERE user_email = ${email} AND action = ${action} LIMIT 1
    `) as { one: number }[];
    return rows.length > 0;
  }
  if (freq === "daily") {
    const rows = (await db`
      SELECT 1 AS one FROM xp_events
      WHERE user_email = ${email}
        AND action = ${action}
        AND DATE(created_at AT TIME ZONE 'Asia/Kolkata') = DATE(now() AT TIME ZONE 'Asia/Kolkata')
      LIMIT 1
    `) as { one: number }[];
    return rows.length > 0;
  }
  return false;
}

/**
 * Award XP for an action. Never trusts client-sent point values — points come
 * from the server catalog. Applies the once-ever / once-per-IST-day rules.
 */
export async function awardXp(email: string, action: string, page: string | null): Promise<AwardResult> {
  const def = XP_CATALOG[action];
  if (!def) throw new Error(`Unknown XP action: ${action}`);
  const total = await totalFor(email);
  if (await alreadyAwarded(email, action)) {
    return { awarded: false, points: 0, total, level: levelFor(total) };
  }
  const db = sql();
  await db`
    INSERT INTO xp_events (user_email, action, points, page)
    VALUES (${email}, ${action}, ${def.points}, ${page})
  `;
  const newTotal = total + def.points;
  return { awarded: true, points: def.points, total: newTotal, level: levelFor(newTotal) };
}

/** Full XP profile for the "me" endpoint. */
export async function getXpSummary(email: string): Promise<XpSummary> {
  const db = sql();
  const total = await totalFor(email);
  const { level, nextLevel, progressPct } = levelProgress(total);
  const byActionRows = (await db`
    SELECT action, COUNT(*)::int AS count, COALESCE(SUM(points), 0)::int AS points
    FROM xp_events
    WHERE user_email = ${email}
    GROUP BY action
    ORDER BY points DESC
  `) as { action: string; count: number; points: number }[];
  const recentRows = (await db`
    SELECT action, points, created_at
    FROM xp_events
    WHERE user_email = ${email}
    ORDER BY created_at DESC
    LIMIT 10
  `) as { action: string; points: number; created_at: Date | string }[];
  return {
    total,
    level,
    nextLevel,
    progressPct,
    byAction: byActionRows.map((r) => ({
      action: r.action,
      label: XP_CATALOG[r.action]?.label ?? r.action,
      count: r.count,
      points: r.points,
    })),
    recent: recentRows.map((r) => ({
      action: r.action,
      label: XP_CATALOG[r.action]?.label ?? r.action,
      points: r.points,
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    })),
  };
}
