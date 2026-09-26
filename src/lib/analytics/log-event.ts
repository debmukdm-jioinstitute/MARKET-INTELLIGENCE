import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { GUEST_EMAIL } from "@/lib/auth";
import { getSessionEmail } from "@/lib/session";

export type AnalyticsEventInput = {
  path: string;
  event_type?: string;
  referrer?: string | null;
  session_id?: string | null;
  duration_sec?: number | null;
  user_agent?: string | null;
  meta?: Record<string, unknown> | null;
};

/** Best-effort analytics insert — never throws to callers. */
export async function logAnalyticsEvent(input: AnalyticsEventInput): Promise<void> {
  if (!hasDatabase()) return;
  const path = input.path.slice(0, 300);
  if (!path) return;

  try {
    const email = await getSessionEmail();
    const userEmail = email === GUEST_EMAIL ? null : email;
    const eventType = (input.event_type ?? "pageview").slice(0, 64);
    const referrer = input.referrer?.slice(0, 300) ?? null;
    const sessionId = input.session_id?.slice(0, 64) ?? null;
    const duration =
      input.duration_sec != null && Number.isFinite(input.duration_sec)
        ? Math.min(86400, Math.max(0, input.duration_sec))
        : null;
    const ua = input.user_agent?.slice(0, 240) ?? null;
    const metaJson = input.meta ? JSON.stringify(input.meta).slice(0, 2000) : null;

    await ensureSchema();
    await sql()`
      INSERT INTO analytics_events (user_email, path, referrer, event_type, session_id, duration_sec, user_agent, meta)
      VALUES (
        ${userEmail},
        ${path},
        ${referrer},
        ${eventType},
        ${sessionId},
        ${duration},
        ${ua},
        ${metaJson}::jsonb
      )
    `;
  } catch {
    // ignore
  }
}
