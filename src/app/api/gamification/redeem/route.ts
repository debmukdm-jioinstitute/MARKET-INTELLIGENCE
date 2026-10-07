import { NextResponse } from "next/server";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { PLUS_MONTHLY_XP_COST } from "@/lib/gamification/catalog";
import { getXpSummary } from "@/lib/gamification/store";

export const dynamic = "force-dynamic";

/** Exactly 30 days of Plus per redemption — never the 90-day launch multiplier. */
const REDEEM_PLUS_DAYS = 30;

async function requireUser() {
  const user = await getSessionUser();
  return user && !user.guest ? user : null;
}

/**
 * POST /api/gamification/redeem
 * Body: { reward: "plus_monthly" }
 * Atomically debits PLUS_MONTHLY_XP_COST XP and extends the caller's Plus
 * subscription by exactly 30 days. The balance gate lives inside the same
 * statement as the debit, and xp_events is locked while it runs, so two
 * racing requests cannot both redeem on the same balance.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to redeem points" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });

  const body = await req.json().catch(() => null);
  if (body?.reward !== "plus_monthly") {
    return NextResponse.json({ error: "Unknown reward", known: ["plus_monthly"] }, { status: 400 });
  }

  await ensureSchema();
  const db = sql();

  const summary = await getXpSummary(user.email);
  if (summary.total < PLUS_MONTHLY_XP_COST) {
    return NextResponse.json(
      {
        error: "Not enough XP",
        balance: summary.total,
        cost: PLUS_MONTHLY_XP_COST,
        needed: PLUS_MONTHLY_XP_COST - summary.total,
      },
      { status: 402 },
    );
  }

  const results = (await db.transaction((tx) => [
    tx`LOCK TABLE xp_events IN SHARE ROW EXCLUSIVE MODE`,
    tx`
      WITH debit AS (
        INSERT INTO xp_events (user_email, action, points, page)
        SELECT ${user.email}, 'redeem_plus_monthly', ${-PLUS_MONTHLY_XP_COST}, 'redeem:plus_monthly'
        WHERE (SELECT COALESCE(SUM(points), 0) FROM xp_events WHERE user_email = ${user.email})
          >= ${PLUS_MONTHLY_XP_COST}
        RETURNING id
      )
      UPDATE users
      SET pro_plan = 'pro_monthly',
          pro_expires_at = GREATEST(COALESCE(pro_expires_at, now()), now())
            + make_interval(days => ${REDEEM_PLUS_DAYS})
      WHERE email = ${user.email} AND EXISTS (SELECT 1 FROM debit)
      RETURNING pro_expires_at
    `,
  ])) as unknown[][];

  const updated = (results[1] ?? []) as { pro_expires_at: unknown }[];
  const proExpiresAt = updated[0]?.pro_expires_at;
  if (!proExpiresAt) {
    // Balance dropped between the pre-check and the debit (e.g. a racing request).
    const fresh = await getXpSummary(user.email);
    return NextResponse.json(
      {
        error: "Not enough XP",
        balance: fresh.total,
        cost: PLUS_MONTHLY_XP_COST,
        needed: PLUS_MONTHLY_XP_COST - fresh.total,
      },
      { status: 402 },
    );
  }

  return NextResponse.json({
    ok: true,
    reward: "plus_monthly",
    days: REDEEM_PLUS_DAYS,
    cost: PLUS_MONTHLY_XP_COST,
    balance: summary.total - PLUS_MONTHLY_XP_COST,
    pro_expires_at: new Date(String(proExpiresAt)).toISOString(),
  });
}
