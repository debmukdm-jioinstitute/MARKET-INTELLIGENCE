import { sql, toDateString } from "@/lib/db";
import { getISTDate } from "@/lib/gamification/missions";

const MINUTES_PER_DAY_CAP = 60;
const HEARTBEAT_THROTTLE_SECONDS = 45;
const STREAK_MIN_MINUTES = 5;

export interface HeartbeatResult {
  minutesToday: number;
  day: string;
}

export interface StreakResult {
  streak: number;
  /** IST day the current streak started, or null when there is no streak. */
  startDay: string | null;
}

function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * Record one minute of engagement for the current IST day.
 * Heartbeats closer than HEARTBEAT_THROTTLE_SECONDS are ignored so a client
 * pinging every minute cannot inflate minutes; minutes cap at 60/day.
 */
export async function recordHeartbeat(email: string): Promise<HeartbeatResult> {
  const db = sql();
  const day = getISTDate();
  const rows = (await db`
    WITH up AS (
      INSERT INTO daily_engagement (user_email, day, minutes, last_ping)
      VALUES (${email}, ${day}, 1, now())
      ON CONFLICT (user_email, day) DO UPDATE SET
        minutes = CASE
          WHEN daily_engagement.last_ping IS NULL
            OR now() - daily_engagement.last_ping >= make_interval(secs => ${HEARTBEAT_THROTTLE_SECONDS})
          THEN LEAST(daily_engagement.minutes + 1, ${MINUTES_PER_DAY_CAP})
          ELSE daily_engagement.minutes
        END,
        last_ping = CASE
          WHEN daily_engagement.last_ping IS NULL
            OR now() - daily_engagement.last_ping >= make_interval(secs => ${HEARTBEAT_THROTTLE_SECONDS})
          THEN now()
          ELSE daily_engagement.last_ping
        END
      RETURNING minutes
    )
    SELECT minutes FROM up
  `) as { minutes: number }[];
  return { minutesToday: rows[0]?.minutes ?? 0, day };
}

/** Minutes recorded for the current IST day (read-only; does not ping). */
export async function getMinutesToday(email: string): Promise<number> {
  const db = sql();
  const rows = (await db`
    SELECT minutes FROM daily_engagement
    WHERE user_email = ${email} AND day = ${getISTDate()}::date
  `) as { minutes: number }[];
  return rows[0]?.minutes ?? 0;
}

/**
 * Consecutive IST days (ending today, or yesterday when today has < 5 minutes
 * so far) with at least STREAK_MIN_MINUTES of engagement each.
 */
export async function getStreak(email: string): Promise<StreakResult> {
  const db = sql();
  const today = getISTDate();
  const rows = (await db`
    SELECT day, minutes FROM daily_engagement
    WHERE user_email = ${email} AND day <= ${today}::date
    ORDER BY day DESC
    LIMIT 90
  `) as { day: unknown; minutes: number }[];
  const byDay = new Map<string, number>();
  for (const r of rows) byDay.set(toDateString(r.day), r.minutes);

  let cursor = today;
  if ((byDay.get(cursor) ?? 0) < STREAK_MIN_MINUTES) cursor = shiftDay(cursor, -1);

  let streak = 0;
  while ((byDay.get(cursor) ?? 0) >= STREAK_MIN_MINUTES) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return { streak, startDay: streak > 0 ? shiftDay(cursor, 1) : null };
}
