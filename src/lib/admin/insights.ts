/**
 * Admin "AI Insights" engine — honest, statistically-grounded website intelligence.
 *
 * Methods used (labeled honestly in the UI, no invented ML claims):
 *  - Health score: weighted composite of freshness / cron reliability / growth / engagement.
 *  - Anomalies: z-score (|z| > 2.5) over ≥14 days of daily history per metric.
 *  - Staleness forecast: last_ok + typical collection interval derived from
 *    collected_obs fetched_at spacing (median of last 10 gaps); confidence from
 *    sample size and coefficient of variation.
 *  - Collector failure risk: heuristic (fail_streak + 30d success rate).
 *  - XP liability: exact sums from the xp_events ledger + earn-velocity projection.
 *  - Ops brief: facts rendered as text, then abstractive-summarized with
 *    facebook/bart-large-cnn via the shared HF client (best-effort; template
 *    fallback when HF is unavailable).
 *
 * Every function is defensive: missing/empty tables yield empty or neutral
 * results, never throws.
 */

import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { ensureCollectorSchema } from "@/lib/collector/store";
import { summarizeText } from "@/lib/hf/summarizer";

// ---------------------------------------------------------------------------
// Small defensive helpers
// ---------------------------------------------------------------------------

async function tableExists(name: string): Promise<boolean> {
  try {
    const db = sql();
    const rows = (await db`SELECT to_regclass(${`public.${name}`}) AS r`) as { r: string | null }[];
    return rows[0]?.r != null;
  } catch {
    return false;
  }
}

/** Run a query, returning [] on any failure (missing table, no DB, …). */
async function safeQuery<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    if (!hasDatabase()) return [];
    return await fn();
  } catch {
    return [];
  }
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const isoNow = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// 1. Health score
// ---------------------------------------------------------------------------

export type HealthComponent = {
  score: number; // 0–100
  detail: string;
  available: boolean;
};

export type HealthScore = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  components: {
    freshness: HealthComponent;
    cron: HealthComponent;
    growth: HealthComponent;
    engagement: HealthComponent;
  };
  computed_at: string;
};

function growthScore(cur: number, prev: number): number {
  if (prev <= 0) return cur > 0 ? 100 : 50;
  return clamp(Math.round((50 * cur) / prev), 0, 100);
}

async function freshnessComponent(): Promise<HealthComponent> {
  const rows = await safeQuery<{ total: string; fresh: string }>(
    async () =>
      (await sql()`
        SELECT COUNT(*)::text AS total,
               COUNT(*) FILTER (WHERE last_ok > now() - interval '48 hours')::text AS fresh
        FROM collected_series
      `) as { total: string; fresh: string }[],
  );
  const total = Number(rows[0]?.total ?? 0);
  if (total === 0)
    return { score: 50, detail: "No collector series registered", available: false };
  const fresh = Number(rows[0]?.fresh ?? 0);
  const score = Math.round((100 * fresh) / total);
  return { score, detail: `${fresh}/${total} series fresh (<48h)`, available: true };
}

async function cronComponent(): Promise<HealthComponent> {
  if (!(await tableExists("cron_run_log")))
    return { score: 50, detail: "cron_run_log not yet instrumented", available: false };
  const rows = await safeQuery<{ total: string; ok: string }>(
    async () =>
      (await sql()`
        SELECT COUNT(*)::text AS total,
               COUNT(*) FILTER (WHERE lower(status) IN ('ok','success','completed','succeeded'))::text AS ok
        FROM cron_run_log
        WHERE started_at > now() - interval '7 days'
      `) as { total: string; ok: string }[],
  );
  const total = Number(rows[0]?.total ?? 0);
  if (total === 0) return { score: 50, detail: "No cron runs in last 7d", available: false };
  const ok = Number(rows[0]?.ok ?? 0);
  return {
    score: Math.round((100 * ok) / total),
    detail: `${ok}/${total} runs succeeded (7d)`,
    available: true,
  };
}

async function growthComponent(): Promise<HealthComponent> {
  const rows = await safeQuery<{ cur: string; prev: string }>(
    async () =>
      (await sql()`
        SELECT
          COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::text AS cur,
          COUNT(*) FILTER (WHERE created_at > now() - interval '14 days' AND created_at <= now() - interval '7 days')::text AS prev
        FROM users
      `) as { cur: string; prev: string }[],
  );
  const cur = Number(rows[0]?.cur ?? 0);
  const prev = Number(rows[0]?.prev ?? 0);
  return {
    score: growthScore(cur, prev),
    detail: `${cur} signups (7d) vs ${prev} prior 7d`,
    available: true,
  };
}

async function engagementComponent(): Promise<HealthComponent> {
  const rows = await safeQuery<{ cur: string; prev: string }>(
    async () =>
      (await sql()`
        WITH dau AS (
          SELECT (created_at AT TIME ZONE 'Asia/Kolkata')::date AS d, COUNT(DISTINCT user_email) AS n
          FROM analytics_events
          WHERE created_at > now() - interval '14 days' AND user_email IS NOT NULL
          GROUP BY 1
        )
        SELECT
          COALESCE(AVG(n) FILTER (WHERE d > (now() - interval '7 days')::date), 0)::text AS cur,
          COALESCE(AVG(n) FILTER (WHERE d <= (now() - interval '7 days')::date), 0)::text AS prev
        FROM dau
      `) as { cur: string; prev: string }[],
  );
  const cur = Number(rows[0]?.cur ?? 0);
  const prev = Number(rows[0]?.prev ?? 0);
  const available = cur > 0 || prev > 0;
  return {
    score: available ? growthScore(cur, prev) : 50,
    detail: available
      ? `avg DAU ${round1(cur)} (7d) vs ${round1(prev)} prior`
      : "No analytics events yet",
    available,
  };
}

export async function computeHealthScore(): Promise<HealthScore> {
  try {
    await ensureSchema().catch(() => {});
    await ensureCollectorSchema().catch(() => {});
  } catch {
    /* best-effort */
  }
  const [freshness, cron, growth, engagement] = await Promise.all([
    freshnessComponent(),
    cronComponent(),
    growthComponent(),
    engagementComponent(),
  ]);
  const weights: Array<[HealthComponent, number]> = [
    [freshness, 0.3],
    [cron, 0.3],
    [growth, 0.2],
    [engagement, 0.2],
  ];
  const avail = weights.filter(([c]) => c.available);
  const denom = avail.reduce((s, [, w]) => s + w, 0) || 1;
  const score = Math.round(avail.reduce((s, [c, w]) => s + c.score * w, 0) / denom);
  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "F";
  return { score, grade, components: { freshness, cron, growth, engagement }, computed_at: isoNow() };
}

// ---------------------------------------------------------------------------
// 2. Anomaly detection (z-score, |z| > 2.5, ≥14 days history)
// ---------------------------------------------------------------------------

export type Anomaly = {
  metric: string;
  date: string;
  value: number;
  expected: number;
  z: number;
  severity: "high" | "medium";
  method: string;
};

type DailyPoint = { d: string; n: number };

function zAnomalies(metric: string, points: DailyPoint[]): Anomaly[] {
  if (points.length < 15) return []; // need ≥14 days of history + the day under test
  const sorted = [...points].sort((a, b) => (a.d < b.d ? -1 : 1));
  const history = sorted.slice(0, -1);
  const latest = sorted[sorted.length - 1];
  const vals = history.map((p) => p.n);
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
  const std = Math.sqrt(variance);
  if (std === 0) return [];
  const z = (latest.n - mean) / std;
  if (Math.abs(z) <= 2.5) return [];
  return [
    {
      metric,
      date: latest.d,
      value: latest.n,
      expected: round1(mean),
      z: round1(z),
      severity: Math.abs(z) > 3.5 ? "high" : "medium",
      method: "z-score anomaly (|z|>2.5, ≥14d history)",
    },
  ];
}

async function dailySeries(kind: "signups" | "xp" | "pageviews" | "referrals"): Promise<DailyPoint[]> {
  const table =
    kind === "signups" ? "users" : kind === "xp" ? "xp_events" : kind === "pageviews" ? "analytics_events" : "referrals";
  if (!(await tableExists(table))) return [];
  return safeQuery<DailyPoint>(async () => {
    const db = sql();
    let rows: { d: string; n: string }[];
    if (kind === "signups") {
      rows = (await db`
        SELECT (created_at AT TIME ZONE 'Asia/Kolkata')::date::text AS d, COUNT(*)::text AS n
        FROM users WHERE created_at > now() - interval '31 days' GROUP BY 1 ORDER BY 1
      `) as { d: string; n: string }[];
    } else if (kind === "xp") {
      rows = (await db`
        SELECT (created_at AT TIME ZONE 'Asia/Kolkata')::date::text AS d, COALESCE(SUM(points),0)::text AS n
        FROM xp_events WHERE created_at > now() - interval '31 days' AND points > 0 GROUP BY 1 ORDER BY 1
      `) as { d: string; n: string }[];
    } else if (kind === "pageviews") {
      rows = (await db`
        SELECT (created_at AT TIME ZONE 'Asia/Kolkata')::date::text AS d, COUNT(*)::text AS n
        FROM analytics_events WHERE created_at > now() - interval '31 days' GROUP BY 1 ORDER BY 1
      `) as { d: string; n: string }[];
    } else {
      rows = (await db`
        SELECT (created_at AT TIME ZONE 'Asia/Kolkata')::date::text AS d, COUNT(*)::text AS n
        FROM referrals WHERE created_at > now() - interval '31 days' GROUP BY 1 ORDER BY 1
      `) as { d: string; n: string }[];
    }
    return rows.map((r) => ({ d: r.d, n: Number(r.n) }));
  });
}

export async function detectAnomalies(): Promise<Anomaly[]> {
  const [signups, xp, pageviews, referrals] = await Promise.all([
    dailySeries("signups"),
    dailySeries("xp"),
    dailySeries("pageviews"),
    dailySeries("referrals"),
  ]);
  const out: Anomaly[] = [
    ...zAnomalies("daily signups", signups),
    ...zAnomalies("daily XP awarded", xp),
    ...zAnomalies("daily page views", pageviews),
    ...zAnomalies("daily referrals", referrals),
  ];
  // Collector fail-streak spikes (rule-based, labeled as such).
  const streaks = await safeQuery<{ id: string; label: string; fail_streak: number }>(async () => {
    await ensureCollectorSchema().catch(() => {});
    return (await sql()`
      SELECT id, label, fail_streak FROM collected_series WHERE fail_streak >= 3
    `) as { id: string; label: string; fail_streak: number }[];
  });
  for (const s of streaks) {
    out.push({
      metric: `collector fail streak: ${s.label}`,
      date: new Date().toISOString().slice(0, 10),
      value: s.fail_streak,
      expected: 0,
      z: s.fail_streak, // rule-based, not a true z-score
      severity: s.fail_streak >= 5 ? "high" : "medium",
      method: "rule: consecutive failures ≥ 3",
    });
  }
  return out.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
}

// ---------------------------------------------------------------------------
// 3. Staleness forecast
// ---------------------------------------------------------------------------

export type StalenessForecast = {
  series_id: string;
  label: string;
  hours_since_ok: number | null;
  typical_interval_hours: number | null;
  stale_in_hours: number;
  confidence: "high" | "medium" | "low";
  method: string;
};

const FRESHNESS_WINDOW_HOURS = 48; // matches src/lib/health/sources.ts

async function typicalIntervalHours(seriesId: string): Promise<{ h: number | null; confidence: "high" | "medium" | "low" }> {
  const rows = await safeQuery<{ f: string }>(
    async () =>
      (await sql()`
        SELECT fetched_at::text AS f FROM collected_obs
        WHERE series_id = ${seriesId}
        ORDER BY fetched_at DESC LIMIT 11
      `) as { f: string }[],
  );
  const ts = rows.map((r) => new Date(r.f).getTime()).filter((t) => !Number.isNaN(t)).sort((a, b) => a - b);
  if (ts.length < 3) return { h: null, confidence: "low" };
  const gaps = ts.slice(1).map((t, i) => (t - ts[i]) / 3_600_000).filter((g) => g > 0.5);
  if (gaps.length < 2) return { h: null, confidence: "low" };
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  const cv = mean > 0 ? Math.sqrt(gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length) / mean : 1;
  const confidence = gaps.length >= 5 && cv < 0.5 ? "high" : gaps.length >= 3 ? "medium" : "low";
  return { h: round1(median), confidence };
}

export async function forecastStaleness(): Promise<StalenessForecast[]> {
  const series = await safeQuery<{ id: string; label: string; last_ok: string | null }>(async () => {
    await ensureCollectorSchema().catch(() => {});
    return (await sql()`
      SELECT id, label, last_ok::text AS last_ok FROM collected_series ORDER BY label
    `) as { id: string; label: string; last_ok: string | null }[];
  });
  const out: StalenessForecast[] = [];
  for (const s of series) {
    const lastOkMs = s.last_ok ? new Date(s.last_ok).getTime() : NaN;
    const hoursSinceOk = Number.isNaN(lastOkMs) ? null : round1((Date.now() - lastOkMs) / 3_600_000);
    const { h: interval, confidence } = await typicalIntervalHours(s.id);
    // A series is "fresh" while last_ok is within 48h; forecast assumes the
    // collector keeps its typical cadence, with a 2× grace multiplier.
    const horizon = Math.max(FRESHNESS_WINDOW_HOURS, 2 * (interval ?? FRESHNESS_WINDOW_HOURS / 2));
    const staleIn = hoursSinceOk == null ? -999 : round1(horizon - hoursSinceOk);
    if (staleIn < 72) {
      out.push({
        series_id: s.id,
        label: s.label,
        hours_since_ok: hoursSinceOk,
        typical_interval_hours: interval,
        stale_in_hours: staleIn,
        confidence,
        method: "last_ok + max(48h, 2× typical interval from obs spacing)",
      });
    }
  }
  return out.sort((a, b) => a.stale_in_hours - b.stale_in_hours);
}

// ---------------------------------------------------------------------------
// 4. Collector reliability
// ---------------------------------------------------------------------------

export type CollectorReliability = {
  series_id: string;
  label: string;
  fail_streak: number;
  success_rate_30d: number | null;
  predicted_failure_risk: "low" | "medium" | "high";
  method: string;
};

export async function collectorReliability(): Promise<CollectorReliability[]> {
  const series = await safeQuery<{ id: string; label: string; fail_streak: number }>(async () => {
    await ensureCollectorSchema().catch(() => {});
    return (await sql()`
      SELECT id, label, fail_streak FROM collected_series ORDER BY label
    `) as { id: string; label: string; fail_streak: number }[];
  });
  const hasLog = await tableExists("cron_run_log");
  const out: CollectorReliability[] = [];
  for (const s of series) {
    let successRate: number | null = null;
    if (hasLog) {
      const rows = await safeQuery<{ total: string; ok: string }>(
        async () =>
          (await sql()`
            SELECT COUNT(*)::text AS total,
                   COUNT(*) FILTER (WHERE lower(status) IN ('ok','success','completed','succeeded'))::text AS ok
            FROM cron_run_log
            WHERE started_at > now() - interval '30 days'
              AND (job_name = ${s.id} OR job_name ILIKE '%' || ${s.id} || '%')
          `) as { total: string; ok: string }[],
      );
      const total = Number(rows[0]?.total ?? 0);
      if (total > 0) successRate = round1(Number(rows[0]?.ok ?? 0) / total);
    }
    const risk =
      s.fail_streak >= 2 || (successRate != null && successRate < 0.7)
        ? "high"
        : s.fail_streak >= 1 || (successRate != null && successRate < 0.9)
          ? "medium"
          : "low";
    out.push({
      series_id: s.id,
      label: s.label,
      fail_streak: s.fail_streak,
      success_rate_30d: successRate,
      predicted_failure_risk: risk,
      method: "heuristic risk: fail_streak ≥2 or 30d success <0.7 → high",
    });
  }
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return out.sort((a, b) => rank[a.predicted_failure_risk] - rank[b.predicted_failure_risk]);
}

// ---------------------------------------------------------------------------
// 5. XP liability
// ---------------------------------------------------------------------------

export type XpLiability = {
  total_outstanding_xp: number;
  users_with_xp: number;
  near_redemption_count: number;
  free_months_liability: number;
  earn_velocity_xp_per_day: number;
  projected_free_months_per_month: number;
  computed_at: string;
};

const XP_REDEEM_COST = 300;

export async function xpLiability(): Promise<XpLiability> {
  const balances = await safeQuery<{ email: string; bal: string }>(
    async () =>
      (await sql()`
        SELECT user_email AS email, COALESCE(SUM(points),0)::text AS bal
        FROM xp_events GROUP BY user_email
      `) as { email: string; bal: string }[],
  );
  let total = 0;
  let near = 0;
  let months = 0;
  let users = 0;
  for (const b of balances) {
    const bal = Number(b.bal);
    if (bal <= 0) continue;
    users += 1;
    total += bal;
    if (bal >= XP_REDEEM_COST - 50 && bal < XP_REDEEM_COST) near += 1;
    months += Math.floor(bal / XP_REDEEM_COST);
  }
  const vel = await safeQuery<{ v: string }>(
    async () =>
      (await sql()`
        SELECT COALESCE(SUM(points) FILTER (WHERE points > 0),0)::text AS v
        FROM xp_events WHERE created_at > now() - interval '7 days'
      `) as { v: string }[],
  );
  const velocity = Number(vel[0]?.v ?? 0) / 7;
  return {
    total_outstanding_xp: total,
    users_with_xp: users,
    near_redemption_count: near,
    free_months_liability: months,
    earn_velocity_xp_per_day: round1(velocity),
    projected_free_months_per_month: round1((velocity * 30) / XP_REDEEM_COST),
    computed_at: isoNow(),
  };
}

// ---------------------------------------------------------------------------
// 6. Ops brief (HF summarizer, best-effort; template fallback; 6h cache)
// ---------------------------------------------------------------------------

export type OpsBrief = {
  text: string; // bullets, one per line starting with "• "
  generated_at: string;
  source: "hf" | "template";
};

let briefMem: { brief: OpsBrief; expiresAt: number } | null = null;
const BRIEF_TTL_MS = 6 * 60 * 60 * 1000;

async function ensureBriefCacheTable(): Promise<void> {
  try {
    if (!hasDatabase()) return;
    await sql()`CREATE TABLE IF NOT EXISTS ops_brief_cache (
      id int PRIMARY KEY, text text NOT NULL, source text NOT NULL,
      generated_at timestamptz NOT NULL DEFAULT now()
    )`;
  } catch {
    /* best-effort */
  }
}

function templateBrief(facts: string[]): string {
  const pick = (n: number) => facts.slice(0, n).map((f) => `• ${f}`);
  return pick(5).join("\n") || "• No operational data available yet.";
}

export async function generateOpsBrief(force = false): Promise<OpsBrief> {
  const now = Date.now();
  if (!force && briefMem && now < briefMem.expiresAt) return briefMem.brief;

  await ensureBriefCacheTable();
  if (!force) {
    try {
      const rows = (await sql()`
        SELECT text, source, generated_at FROM ops_brief_cache WHERE id = 1
      `) as { text: string; source: string; generated_at: string }[];
      const r = rows[0];
      if (r && now - new Date(r.generated_at).getTime() < BRIEF_TTL_MS) {
        const brief: OpsBrief = {
          text: r.text,
          generated_at: new Date(r.generated_at).toISOString(),
          source: r.source === "hf" ? "hf" : "template",
        };
        briefMem = { brief, expiresAt: now + BRIEF_TTL_MS };
        return brief;
      }
    } catch {
      /* fall through to regenerate */
    }
  }

  // Gather facts (each compute is already defensive).
  const [health, anomalies, staleness, liability] = await Promise.all([
    computeHealthScore(),
    detectAnomalies(),
    forecastStaleness(),
    xpLiability(),
  ]);
  const paid = await safeQuery<{ n: string; amt: string }>(
    async () =>
      (await sql()`
        SELECT COUNT(*)::text AS n, COALESCE(SUM(amount_paise),0)::text AS amt
        FROM razorpay_orders
        WHERE status = 'paid' AND paid_at > (now() - interval '1 day')
      `) as { n: string; amt: string }[],
  );
  const signups = await safeQuery<{ n: string }>(
    async () =>
      (await sql()`
        SELECT COUNT(*)::text AS n FROM users WHERE created_at > (now() - interval '1 day')
      `) as { n: string }[],
  );

  const facts: string[] = [
    `Overall website health score is ${health.score}/100 (grade ${health.grade}).`,
    `Data freshness: ${health.components.freshness.detail}. Cron reliability: ${health.components.cron.detail}.`,
    anomalies.length
      ? `${anomalies.length} anomal${anomalies.length === 1 ? "y" : "ies"} detected, worst: ${anomalies[0].metric} on ${anomalies[0].date} (value ${anomalies[0].value} vs expected ${anomalies[0].expected}, z=${anomalies[0].z}).`
      : "No statistical anomalies detected in the last 30 days.",
    staleness.length
      ? `Most urgent data staleness: ${staleness[0].label} goes stale in ${staleness[0].stale_in_hours}h (${staleness[0].confidence} confidence).`
      : "No collectors forecast to go stale in the next 72 hours.",
    `Yesterday: ${signups[0]?.n ?? 0} new signups, ${paid[0]?.n ?? 0} paid orders (₹${(Number(paid[0]?.amt ?? 0) / 100).toLocaleString("en-IN")}).`,
    `XP liability: ${liability.total_outstanding_xp.toLocaleString("en-IN")} XP outstanding across ${liability.users_with_xp} users; ${liability.free_months_liability} free months redeemable now; ~${liability.projected_free_months_per_month}/month at current earn velocity.`,
  ];

  let text: string;
  let source: "hf" | "template" = "template";
  try {
    const summary = await summarizeText(facts.join(" "), 130);
    if (summary && summary.trim().length > 40) {
      // Split the abstractive summary back into readable bullets on sentence boundaries.
      const sentences = summary.match(/[^.!?]+[.!?]+/g) ?? [summary];
      text = sentences
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5)
        .map((s) => `• ${s}`)
        .join("\n");
      source = "hf";
    } else {
      text = templateBrief(facts);
    }
  } catch {
    text = templateBrief(facts);
  }

  const brief: OpsBrief = { text, generated_at: isoNow(), source };
  briefMem = { brief, expiresAt: now + BRIEF_TTL_MS };
  try {
    await sql()`INSERT INTO ops_brief_cache (id, text, source, generated_at)
      VALUES (1, ${text}, ${source}, now())
      ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text, source = EXCLUDED.source, generated_at = now()`;
  } catch {
    /* memory cache is enough */
  }
  return brief;
}
