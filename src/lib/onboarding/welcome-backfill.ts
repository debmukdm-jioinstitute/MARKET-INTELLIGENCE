import { hasEmailConfigured, isSandboxSender } from "@/lib/admin/email";
import { GUEST_EMAIL } from "@/lib/auth";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { sendWelcomePackWithResult } from "@/lib/onboarding/send-welcome-pack";

/**
 * The founder welcome email began going out at sign-up on 2026-09-27 02:20 IST (commit 27ae279). Members who
 * joined before that never received it. Anyone created after this instant is assumed to have got it at sign-up,
 * so they are NOT re-sent (and any explicit send from now on is recorded in users.welcome_sent_at).
 */
export const WELCOME_LIVE_AT = "2026-09-26T20:50:15Z";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Member = { email: string; name: string; created_at: string; role: string };

export type BackfillPreview = {
  ready: boolean;
  blocker?: string;
  eligible: number;
  skippedOptedOut: number;
  alreadySent: number;
  joinedAfterLaunch: number;
  sample: string[];
};

/** "jane.doe@gmail.com" -> "j***@gmail.com" so previews never leak full addresses into logs or screenshots. */
const mask = (e: string) => e.replace(/^(.).*(@.*)$/, "$1***$2");

function blocker(): string | undefined {
  if (!hasDatabase()) return "Database not configured.";
  if (!hasEmailConfigured()) return "RESEND_API_KEY is not set.";
  if (isSandboxSender()) return "Email is using the Resend sandbox sender, which only delivers to the account owner. Set a verified sender first.";
  return undefined;
}

async function eligibleMembers(limit: number): Promise<Member[]> {
  const rows = (await sql()`
    SELECT email, name, created_at, role FROM users
    WHERE welcome_sent_at IS NULL
      AND newsletter_opt_out = false
      AND created_at < ${WELCOME_LIVE_AT}::timestamptz
      AND email LIKE '%@%' AND email <> ${GUEST_EMAIL}
    ORDER BY created_at ASC
    LIMIT ${limit}
  `) as unknown as Member[];
  return rows.filter((r) => EMAIL_RE.test(r.email));
}

/** Read-only: how many members would receive the email, and why others are skipped. Sends nothing. */
export async function previewWelcomeBackfill(): Promise<BackfillPreview> {
  const b = blocker();
  if (!hasDatabase()) return { ready: false, blocker: b, eligible: 0, skippedOptedOut: 0, alreadySent: 0, joinedAfterLaunch: 0, sample: [] };
  await ensureSchema();
  const db = sql();
  const [c] = (await db`
    SELECT
      count(*) FILTER (WHERE welcome_sent_at IS NULL AND newsletter_opt_out = false AND created_at < ${WELCOME_LIVE_AT}::timestamptz AND email LIKE '%@%' AND email <> ${GUEST_EMAIL})::int AS eligible,
      count(*) FILTER (WHERE welcome_sent_at IS NULL AND newsletter_opt_out = true AND created_at < ${WELCOME_LIVE_AT}::timestamptz)::int AS opted_out,
      count(*) FILTER (WHERE welcome_sent_at IS NOT NULL)::int AS already_sent,
      count(*) FILTER (WHERE welcome_sent_at IS NULL AND created_at >= ${WELCOME_LIVE_AT}::timestamptz)::int AS after_launch
    FROM users
  `) as unknown as { eligible: number; opted_out: number; already_sent: number; after_launch: number }[];
  const sample = (await eligibleMembers(5)).map((m) => mask(m.email));
  return { ready: !b, blocker: b, eligible: c.eligible, skippedOptedOut: c.opted_out, alreadySent: c.already_sent, joinedAfterLaunch: c.after_launch, sample };
}

export type BackfillResult = { sent: number; failed: number; remaining: number; stopped?: string; errors: string[] };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sends the welcome email to the next `limit` eligible members, one at a time (~2/sec, Resend's limit). Idempotent: a
 * member is only marked once delivery succeeds, so re-running never double-sends and failures are retried. Stops early
 * after 3 failures in a row (e.g. a daily quota) instead of grinding through everyone.
 */
export async function runWelcomeBackfillChunk(limit: number, origin: string): Promise<BackfillResult> {
  const b = blocker();
  if (b) return { sent: 0, failed: 0, remaining: 0, stopped: b, errors: [] };
  await ensureSchema();
  const batch = await eligibleMembers(Math.min(Math.max(limit, 1), 40));
  let sent = 0;
  let failed = 0;
  let streak = 0;
  let stopped: string | undefined;
  const errors: string[] = [];
  for (const m of batch) {
    const r = await sendWelcomePackWithResult({ email: m.email, name: m.name, role: m.role === "admin" ? "admin" : "user", guest: false }, origin);
    if (r.ok) {
      sent++;
      streak = 0;
    } else {
      failed++;
      streak++;
      errors.push(`${mask(m.email)}: ${r.error ?? "failed"}`);
      if (streak >= 3) {
        stopped = "Stopped after 3 failures in a row. Check the sender domain or Resend quota, then run again.";
        break;
      }
    }
    await sleep(600);
  }
  const [rest] = (await sql()`
    SELECT count(*)::int AS n FROM users
    WHERE welcome_sent_at IS NULL AND newsletter_opt_out = false AND created_at < ${WELCOME_LIVE_AT}::timestamptz
      AND email LIKE '%@%' AND email <> ${GUEST_EMAIL}
  `) as unknown as { n: number }[];
  return { sent, failed, remaining: rest?.n ?? 0, stopped, errors: errors.slice(0, 10) };
}
