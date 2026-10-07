import { sql } from "@/lib/db";

export type FraudSeverity = "low" | "medium" | "high";

export interface FraudFlag {
  user_email: string;
  type:
    | "xp_velocity"
    | "heartbeat_farming"
    | "referral_ring"
    | "self_referral_attempt"
    | "duplicate_accounts"
    | "redemption_burst";
  severity: FraudSeverity;
  reason: string;
  evidence: Record<string, unknown>;
}

const DAY = 24 * 60 * 60 * 1000;

/** Normalize an email local-part for fuzzy identity matching: lowercase, strip separators and trailing digits. */
export function normalizeIdentity(email: string): string {
  const local = email.trim().toLowerCase().split("@")[0] ?? "";
  return local.replace(/[._+\-=]/g, "").replace(/[0-9]+$/, "");
}

/** Normalize a display name for duplicate detection. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
}

type Db = ReturnType<typeof sql>;

/** Rule 1: single-day XP spike > 3× the user's 30-day daily mean AND > 100 XP (needs ≥5 active days). */
async function checkXpVelocity(db: Db, since: Date): Promise<FraudFlag[]> {
  const rows = (await db`
    SELECT user_email,
           COUNT(*)::int AS active_days,
           COALESCE(AVG(day_total), 0)::float AS mean_day,
           COALESCE(MAX(day_total), 0)::int AS max_day
    FROM (
      SELECT user_email, DATE(created_at) AS d, SUM(points)::int AS day_total
      FROM xp_events
      WHERE created_at >= ${since} AND points > 0
      GROUP BY user_email, DATE(created_at)
    ) t
    GROUP BY user_email
    HAVING COUNT(*) >= 5
  `) as { user_email: string; active_days: number; mean_day: number; max_day: number }[];

  return rows
    .filter((r) => r.max_day > 100 && r.max_day > 3 * r.mean_day)
    .slice(0, 100)
    .map((r) => ({
      user_email: r.user_email,
      type: "xp_velocity" as const,
      severity: "medium" as const,
      reason: `Single-day XP spike of ${r.max_day} XP vs ${r.mean_day.toFixed(1)} XP/day average over ${r.active_days} active days`,
      evidence: { max_day_xp: r.max_day, mean_daily_xp: Number(r.mean_day.toFixed(1)), active_days: r.active_days },
    }));
}

/** Rule 2: ≥5 days pinned at/near the 60-min heartbeat cap with zero feature-action XP (idle tab farming). */
async function checkHeartbeatFarming(db: Db, since: Date): Promise<FraudFlag[]> {
  const rows = (await db`
    SELECT d.user_email, COUNT(*)::int AS capped_days
    FROM daily_engagement d
    WHERE d.day >= CURRENT_DATE - INTERVAL '30 days'
      AND d.minutes >= 55
      AND NOT EXISTS (
        SELECT 1 FROM xp_events x
        WHERE x.user_email = d.user_email
          AND x.created_at >= ${since}
          AND x.action NOT IN ('daily_active_5', 'daily_active_10', 'streak_7', 'streak_14', 'streak_21', 'streak_30')
          AND x.points > 0
      )
    GROUP BY d.user_email
    HAVING COUNT(*) >= 5
    LIMIT 100
  `) as { user_email: string; capped_days: number }[];

  return rows.map((r) => ({
    user_email: r.user_email,
    type: "heartbeat_farming" as const,
    severity: "medium" as const,
    reason: `${r.capped_days} days pinned at the 60-minute engagement cap with no feature-usage XP in 30 days — likely idle tab`,
    evidence: { capped_days: r.capped_days, window_days: 30 },
  }));
}

/** Rule 3: referral chains (A→B→C) or ≥3 referees of one referrer created within 60 minutes. */
async function checkReferralRings(db: Db): Promise<FraudFlag[]> {
  const flags: FraudFlag[] = [];

  // 3a: chains — a referee who is also a referrer
  const chains = (await db`
    SELECT r1.referrer_email AS a, r1.referee_email AS b, r2.referee_email AS c
    FROM referrals r1
    JOIN referrals r2 ON r2.referrer_email = r1.referee_email
    LIMIT 100
  `) as { a: string; b: string; c: string }[];
  for (const ch of chains) {
    flags.push({
      user_email: ch.b,
      type: "referral_ring",
      severity: "high",
      reason: `Referral chain detected: ${ch.a} → ${ch.b} → ${ch.c}`,
      evidence: { chain: [ch.a, ch.b, ch.c] },
    });
  }

  // 3b: burst signups — one referrer, ≥3 referees within a 60-minute window
  const bursts = (await db`
    SELECT referrer_email, referee_email, created_at
    FROM referrals
    ORDER BY referrer_email, created_at
    LIMIT 5000
  `) as { referrer_email: string; referee_email: string; created_at: Date | string }[];
  const byReferrer = new Map<string, { email: string; at: number }[]>();
  for (const b of bursts) {
    const at = new Date(b.created_at).getTime();
    const list = byReferrer.get(b.referrer_email) ?? [];
    list.push({ email: b.referee_email, at });
    byReferrer.set(b.referrer_email, list);
  }
  for (const [referrer, list] of byReferrer) {
    if (list.length < 3) continue;
    list.sort((x, y) => x.at - y.at);
    for (let i = 0; i + 2 < list.length; i++) {
      if (list[i + 2].at - list[i].at <= 60 * 60 * 1000) {
        flags.push({
          user_email: referrer,
          type: "referral_ring",
          severity: "high",
          reason: `${list.length} referees signed up; 3+ joined within 60 minutes — possible coordinated signups`,
          evidence: {
            referee_count: list.length,
            burst_window: list.slice(i, i + 3).map((x) => ({
              email: x.email,
              at: new Date(x.at).toISOString(),
            })),
          },
        });
        break;
      }
    }
    if (flags.length > 200) break;
  }
  return flags.slice(0, 200);
}

/** Rule 4: referee whose normalized email identity matches the referrer's (variant-email self-referral). */
async function checkSelfReferralAttempts(db: Db): Promise<FraudFlag[]> {
  const rows = (await db`
    SELECT referrer_email, referee_email, created_at
    FROM referrals
    LIMIT 5000
  `) as { referrer_email: string; referee_email: string; created_at: Date | string }[];

  return rows
    .filter((r) => {
      const a = normalizeIdentity(r.referrer_email);
      const b = normalizeIdentity(r.referee_email);
      return a.length >= 3 && a === b;
    })
    .slice(0, 100)
    .map((r) => ({
      user_email: r.referee_email,
      type: "self_referral_attempt" as const,
      severity: "high" as const,
      reason: `Referee email is a variant of the referrer's own email (${r.referrer_email})`,
      evidence: {
        referrer_email: r.referrer_email,
        referee_email: r.referee_email,
        normalized_identity: normalizeIdentity(r.referee_email),
        created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
      },
    }));
}

/** Rule 5: ≥2 accounts with the same normalized name created within 24h of each other. */
async function checkDuplicateAccounts(db: Db): Promise<FraudFlag[]> {
  const rows = (await db`
    SELECT email, name, created_at
    FROM users
    WHERE role = 'user'
    ORDER BY created_at DESC
    LIMIT 20000
  `) as { email: string; name: string; created_at: Date | string }[];

  const groups = new Map<string, { email: string; at: number }[]>();
  for (const r of rows) {
    const n = normalizeName(r.name || "");
    if (n.length < 3) continue;
    const list = groups.get(n) ?? [];
    list.push({ email: r.email, at: new Date(r.created_at).getTime() });
    groups.set(n, list);
  }
  const flags: FraudFlag[] = [];
  for (const [name, list] of groups) {
    if (list.length < 2) continue;
    list.sort((a, b) => a.at - b.at);
    const cluster: typeof list = [list[0]];
    for (let i = 1; i < list.length; i++) {
      if (list[i].at - cluster[cluster.length - 1].at <= DAY) cluster.push(list[i]);
      else {
        if (cluster.length >= 2) {
          flags.push({
            user_email: cluster[0].email,
            type: "duplicate_accounts",
            severity: "low",
            reason: `${cluster.length} accounts share the name "${name}" created within 24h`,
            evidence: { normalized_name: name, emails: cluster.map((c) => c.email) },
          });
        }
        cluster.length = 0;
        cluster.push(list[i]);
      }
    }
    if (cluster.length >= 2) {
      flags.push({
        user_email: cluster[0].email,
        type: "duplicate_accounts",
        severity: "low",
        reason: `${cluster.length} accounts share the name "${name}" created within 24h`,
        evidence: { normalized_name: name, emails: cluster.map((c) => c.email) },
      });
    }
    if (flags.length > 100) break;
  }
  return flags.slice(0, 100);
}

/** Rule 6: ≥2 Plus redemptions within 7 days by one user. */
async function checkRedemptionBursts(db: Db, since: Date): Promise<FraudFlag[]> {
  const rows = (await db`
    SELECT user_email, COUNT(*)::int AS n,
           MIN(created_at) AS first_at, MAX(created_at) AS last_at
    FROM xp_events
    WHERE action = 'redeem_plus_monthly' AND created_at >= ${since}
    GROUP BY user_email
    HAVING COUNT(*) >= 2
    LIMIT 100
  `) as { user_email: string; n: number; first_at: Date | string; last_at: Date | string }[];

  const iso = (d: Date | string) => (d instanceof Date ? d.toISOString() : d);
  return rows
    .filter((r) => new Date(iso(r.last_at)).getTime() - new Date(iso(r.first_at)).getTime() <= 7 * DAY)
    .map((r) => ({
      user_email: r.user_email,
      type: "redemption_burst" as const,
      severity: "medium" as const,
      reason: `${r.n} Plus-plan redemptions within 7 days — unusually fast XP accumulation or shared account`,
      evidence: { redemptions: r.n, first_at: iso(r.first_at), last_at: iso(r.last_at) },
    }));
}

/** Runs all fraud rules. Callers should cache the result (see /api/admin/security/flags). */
export async function runFraudChecks(): Promise<FraudFlag[]> {
  const db = sql();
  const since = new Date(Date.now() - 30 * DAY);
  const [v, h, r, s, d, b] = await Promise.all([
    checkXpVelocity(db, since).catch(() => [] as FraudFlag[]),
    checkHeartbeatFarming(db, since).catch(() => [] as FraudFlag[]),
    checkReferralRings(db).catch(() => [] as FraudFlag[]),
    checkSelfReferralAttempts(db).catch(() => [] as FraudFlag[]),
    checkDuplicateAccounts(db).catch(() => [] as FraudFlag[]),
    checkRedemptionBursts(db, since).catch(() => [] as FraudFlag[]),
  ]);
  const order: Record<FraudSeverity, number> = { high: 0, medium: 1, low: 2 };
  return [...r, ...s, ...v, ...h, ...b, ...d].sort((a, z) => order[a.severity] - order[z.severity]);
}
