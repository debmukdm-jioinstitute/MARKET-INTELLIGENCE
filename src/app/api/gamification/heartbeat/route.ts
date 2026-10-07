import { NextResponse } from "next/server";
import { ensureSchema, hasDatabase } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { recordHeartbeat, getStreak } from "@/lib/gamification/engagement";
import { awardXp } from "@/lib/gamification/store";

export const dynamic = "force-dynamic";

async function requireUser() {
  const user = await getSessionUser();
  return user && !user.guest ? user : null;
}

const STREAK_MILESTONES = [7, 14, 21, 30];

/**
 * POST /api/gamification/heartbeat
 * Client pings roughly once a minute while the site is open. Records one
 * minute of engagement, then awards threshold XP:
 *  - daily_active_5 / daily_active_10 when today's minutes cross 5 / 10
 *  - streak_N milestones when the consecutive-day streak reaches them
 * Returns the minutes today, the current streak, and anything just awarded.
 */
export async function POST() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to earn points" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });

  await ensureSchema();

  const awarded: string[] = [];
  const { minutesToday, day } = await recordHeartbeat(user.email);

  if (minutesToday >= 5) {
    const r = await awardXp(user.email, "daily_active_5", null);
    if (r.awarded) awarded.push("daily_active_5");
  }
  if (minutesToday >= 10) {
    const r = await awardXp(user.email, "daily_active_10", null);
    if (r.awarded) awarded.push("daily_active_10");
  }

  const { streak, startDay } = await getStreak(user.email);
  for (const m of STREAK_MILESTONES) {
    if (streak >= m && startDay) {
      const r = await awardXp(user.email, `streak_${m}`, `streak:${startDay}`);
      if (r.awarded) awarded.push(`streak_${m}`);
    }
  }

  return NextResponse.json({ ok: true, minutesToday, day, streak, awarded });
}
