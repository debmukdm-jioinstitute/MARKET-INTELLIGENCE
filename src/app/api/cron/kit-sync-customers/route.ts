import { cronUnauthorized } from "@/lib/api-guard";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { tagCustomerInKit } from "@/lib/kit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Keeps the Kit `customers` tag in sync with the `users` table.
 *
 * Each run tags up to BATCH users that were never successfully tagged
 * (`kit_tagged_at IS NULL`) — this backfills every existing user on the first
 * runs after deploy, and afterwards only picks up signups the signup-time
 * hook missed. Tagging in Kit is idempotent, so re-runs are safe.
 *
 * Runs daily via vercel.json. Guarded by CRON_SECRET like the other crons.
 */
const BATCH = 100;
const CONCURRENCY = 8;

export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  if (!hasDatabase()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  if (!process.env.KIT_API_KEY?.trim()) {
    return NextResponse.json({ error: "KIT_API_KEY not set — skipping Kit sync" }, { status: 503 });
  }

  await ensureSchema();
  const db = sql();

  const rows = (await db`
    SELECT email, name FROM users
    WHERE kit_tagged_at IS NULL
    ORDER BY created_at ASC
    LIMIT ${BATCH}
  `) as Array<{ email: string; name: string | null }>;

  let tagged = 0;
  const failed: Array<{ email: string; error?: string }> = [];

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const chunk = rows.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (u) => {
        const r = await tagCustomerInKit(u.email, u.name ?? undefined);
        if (r.ok) {
          try {
            await db`UPDATE users SET kit_tagged_at = now() WHERE email = ${u.email}`;
          } catch {
            /* marked on next run */
          }
          return { ok: true as const };
        }
        return { ok: false as const, email: u.email, error: r.error };
      }),
    );
    for (const r of results) {
      if (r.ok) tagged += 1;
      else failed.push({ email: r.email, error: r.error });
    }
  }

  if (failed.length > 0) {
    console.warn(`[kit-sync-customers] ${failed.length} failed: ${failed.map((f) => f.email).join(", ")}`);
  }

  const remaining = (await db`
    SELECT COUNT(*)::int AS c FROM users WHERE kit_tagged_at IS NULL
  `) as Array<{ c: number }>;

  return NextResponse.json({
    ok: true,
    processed: rows.length,
    tagged,
    failed: failed.length,
    failedEmails: failed.slice(0, 10).map((f) => f.email),
    remaining: remaining[0]?.c ?? 0,
  });
}
