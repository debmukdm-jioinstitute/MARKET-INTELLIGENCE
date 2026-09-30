import { hasDatabase, sql } from "@/lib/db";

export type SourceHealthStatus = "healthy" | "degraded" | "failing" | "unknown";
export type SourceHealthCategory = "collector" | "news" | "quotes" | "macro";

export interface SourceHealth {
  id: string;
  label: string;
  category: SourceHealthCategory;
  lastOk: string | null;
  lastError: string | null;
  lastRun: string | null;
  /** Consecutive recorded failures. 0 when the last run succeeded. */
  failStreak: number;
  status: SourceHealthStatus;
  detail: string | null;
}

/** Consecutive failures before a source is reported as failing (and alerted on). */
export const FAILURE_THRESHOLD = 3;

/**
 * Known collectors (mirrors COLLECTORS in src/lib/collector/run.ts) with the
 * series-id prefixes each one writes. Static display metadata only — health
 * itself always comes from recorded runs, never assumed.
 */
const COLLECTOR_META: { id: string; label: string; seriesPrefixes: string[] }[] = [
  { id: "rbi", label: "RBI key rates", seriesPrefixes: ["rbi_repo", "rbi_sdf", "rbi_msf", "rbi_bank_rate", "rbi_reverse_repo"] },
  { id: "rbi-market", label: "RBI market operations", seriesPrefixes: ["rbi_net_liquidity", "in_call_rate_mid"] },
  { id: "nse-fiidii", label: "NSE FII/DII flows", seriesPrefixes: ["nse_fii_net_cash_cr", "nse_dii_net_cash_cr"] },
  { id: "fred-reserves", label: "India FX reserves", seriesPrefixes: ["india_fx_reserves_ex_gold"] },
  { id: "cboe-vix", label: "CBOE VIX", seriesPrefixes: ["cboe_vix"] },
  { id: "cftc-cot", label: "CFTC positioning", seriesPrefixes: ["cot_"] },
  { id: "bls", label: "US CPI & labor (BLS)", seriesPrefixes: ["us_cpi", "us_unemployment", "us_payrolls"] },
  { id: "ecb", label: "ECB rates & FX", seriesPrefixes: ["ecb_", "eurusd", "ea_hicp"] },
  { id: "amfi", label: "AMFI mutual fund NAVs", seriesPrefixes: ["amfi_"] },
  { id: "damodaran", label: "Damodaran ERP", seriesPrefixes: ["damodaran_"] },
  {
    id: "india-macro",
    label: "India macro (UPI/GST/EPFO)",
    seriesPrefixes: ["in_gst", "in_upi", "in_epfo", "in_naukri", "in_fx_reserves", "in_nifty"],
  },
];

/** Feed-hub source id → health category (ids from FeedSourceId in src/lib/feeds/types.ts). */
const FEED_CATEGORY: Record<string, SourceHealthCategory> = {
  nse: "news",
  bse: "news",
  rbi: "news",
  sec: "news",
  reddit: "news",
  livemint: "news",
  moneycontrol: "news",
  googlenews: "news",
  upstox: "news",
  yahoo: "quotes",
  massive: "quotes",
  stooq: "quotes",
  alphavantage: "quotes",
  biquote: "quotes",
  fred: "macro",
  worldbank: "macro",
  data360: "macro",
  imf: "macro",
  oecd: "macro",
  mospi: "macro",
};

export function feedCategoryFor(sourceId: string): SourceHealthCategory {
  return FEED_CATEGORY[sourceId] ?? "news";
}

export interface FeedHealthInput {
  id: string;
  label: string;
  ok: boolean;
  message?: string | null;
  latencyMs?: number | null;
}

const NOT_CONFIGURED_RE = /api[_ ]?key|not configured/i;

/**
 * Map transient feed-hub health rows to recordable results.
 *
 * Honesty rule: a source that is merely *not configured* (e.g. Massive without
 * MASSIVE_API_KEY) is not a failure — it records as ok with a "Not configured"
 * detail so it never builds a failure streak or triggers alerts. The UI renders
 * these with a neutral "not connected" pill, not a healthy one.
 */
export function feedHealthToResults(rows: FeedHealthInput[]): SourceResultInput[] {
  return rows.map((r) => {
    const notConfigured = !r.ok && NOT_CONFIGURED_RE.test(r.message ?? "");
    const detailParts = [
      notConfigured ? `Not configured — ${r.message ?? "missing API key"}` : null,
      typeof r.latencyMs === "number" ? `${r.latencyMs}ms` : null,
      !r.ok && !notConfigured ? (r.message ?? "no data") : null,
    ].filter(Boolean);
    return {
      id: `feed:${r.id}`,
      label: r.label,
      category: feedCategoryFor(r.id),
      ok: r.ok || notConfigured,
      error: r.ok || notConfigured ? null : (r.message ?? "no data"),
      detail: detailParts.join(" · ") || null,
    };
  });
}

let ready: Promise<void> | null = null;

export function ensureHealthSchema(): Promise<void> {
  if (!hasDatabase()) return Promise.resolve();
  ready ??= (async () => {
    await sql()`
      CREATE TABLE IF NOT EXISTS source_health (
        id text PRIMARY KEY,
        label text NOT NULL,
        category text NOT NULL,
        last_ok timestamptz,
        last_error text,
        last_run timestamptz,
        fail_streak int NOT NULL DEFAULT 0,
        detail text
      )
    `;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

export interface SourceResultInput {
  id: string;
  label: string;
  category: SourceHealthCategory;
  ok: boolean;
  error?: string | null;
  detail?: string | null;
}

/**
 * Record one run's outcome per source. A success resets the failure streak;
 * a failure increments it and stores the error. Only call with real outcomes.
 */
export async function recordSourceResults(rows: SourceResultInput[]): Promise<void> {
  if (!hasDatabase() || !rows.length) return;
  await ensureHealthSchema();
  const db = sql();
  for (const r of rows) {
    if (r.ok) {
      await db`
        INSERT INTO source_health (id, label, category, last_ok, last_error, last_run, fail_streak, detail)
        VALUES (${r.id}, ${r.label}, ${r.category}, now(), NULL, now(), 0, ${r.detail ?? null})
        ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, category = EXCLUDED.category,
          last_ok = now(), last_error = NULL, last_run = now(), fail_streak = 0, detail = EXCLUDED.detail
      `;
    } else {
      await db`
        INSERT INTO source_health (id, label, category, last_ok, last_error, last_run, fail_streak, detail)
        VALUES (${r.id}, ${r.label}, ${r.category}, NULL, ${(r.error ?? "unknown error").slice(0, 300)}, now(), 1, ${r.detail ?? null})
        ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, category = EXCLUDED.category,
          last_error = EXCLUDED.last_error, last_run = now(),
          fail_streak = source_health.fail_streak + 1, detail = EXCLUDED.detail
      `;
    }
  }
}

type CollectorFailureRow = { id: string; last_error: string | null; last_run: string | Date | null; fail_streak: number | null };

const iso = (v: string | Date | null | undefined): string | null =>
  v == null ? null : v instanceof Date ? v.toISOString() : String(v);

/** Pure: collector status from its failure row (if any) and freshest series success. */
export function collectorStatusFrom(
  failure: { last_error: string | null; last_run: string | null; fail_streak: number } | null,
  freshestSeriesOk: string | null,
  now = Date.now(),
): { status: SourceHealthStatus; failStreak: number } {
  if (failure) {
    const streak = failure.fail_streak;
    return { status: streak >= FAILURE_THRESHOLD ? "failing" : "degraded", failStreak: streak };
  }
  if (freshestSeriesOk && now - new Date(freshestSeriesOk).getTime() < 48 * 3_600_000) {
    return { status: "healthy", failStreak: 0 };
  }
  return { status: "unknown", failStreak: 0 };
}

/** Pure: feed-hub source status from its recorded row. */
export function feedStatusFrom(row: {
  last_ok: string | null;
  last_error: string | null;
  last_run: string | null;
  fail_streak: number;
}): SourceHealthStatus {
  if (row.last_run == null) return "unknown";
  if (row.fail_streak >= FAILURE_THRESHOLD) return "failing";
  if (row.last_error != null) return "degraded";
  return "healthy";
}

/**
 * Unified source health: scheduled collectors (from collected_series, written by
 * Phase 3) plus feed-hub sources (from source_health, written by the
 * warm-feed-hub cron). Empty without a database — never invented.
 */
export async function getSourceHealth(now = Date.now()): Promise<SourceHealth[]> {
  if (!hasDatabase()) return [];
  const db = sql();
  const out: SourceHealth[] = [];

  try {
    await ensureHealthSchema();
    // Collector failure rows: id = 'collector:<collectorId>' (deleted on success).
    const failures = (await db`
      SELECT id, last_error, last_run, fail_streak FROM collected_series WHERE id LIKE 'collector:%'
    `) as CollectorFailureRow[];
    const failureById = new Map(failures.map((f) => [f.id.slice("collector:".length), f]));

    for (const meta of COLLECTOR_META) {
      const f = failureById.get(meta.id) ?? null;
      let freshest: string | null = null;
      if (!f) {
        // Freshest success across this collector's series (single light query, matched in JS).
        const series = (await db`
          SELECT id, last_ok FROM collected_series WHERE id NOT LIKE 'collector:%' AND last_ok IS NOT NULL
        `) as { id: string; last_ok: string | Date | null }[];
        let best = 0;
        for (const s of series) {
          if (!meta.seriesPrefixes.some((p) => s.id.startsWith(p))) continue;
          const t = new Date(s.last_ok as string).getTime();
          if (t > best) best = t;
        }
        freshest = best ? new Date(best).toISOString() : null;
      }
      const { status, failStreak } = collectorStatusFrom(
        f ? { last_error: f.last_error, last_run: iso(f.last_run), fail_streak: f.fail_streak ?? 1 } : null,
        freshest,
        now,
      );
      out.push({
        id: `collector:${meta.id}`,
        label: meta.label,
        category: "collector",
        lastOk: freshest,
        lastError: f?.last_error ?? null,
        lastRun: f ? iso(f.last_run) : freshest,
        failStreak,
        status,
        detail: f ? `${failStreak} consecutive failure${failStreak === 1 ? "" : "s"}` : null,
      });
    }

    const feedRows = (await db`
      SELECT id, label, category, last_ok, last_error, last_run, fail_streak, detail FROM source_health ORDER BY id
    `) as {
      id: string;
      label: string;
      category: string;
      last_ok: string | Date | null;
      last_error: string | null;
      last_run: string | Date | null;
      fail_streak: number | null;
      detail: string | null;
    }[];
    for (const r of feedRows) {
      const row = {
        last_ok: iso(r.last_ok),
        last_error: r.last_error,
        last_run: iso(r.last_run),
        fail_streak: r.fail_streak ?? 0,
      };
      out.push({
        id: r.id,
        label: r.label,
        category: (r.category as SourceHealthCategory) ?? "news",
        lastOk: row.last_ok,
        lastError: row.last_error,
        lastRun: row.last_run,
        failStreak: row.fail_streak,
        status: feedStatusFrom(row),
        detail: r.detail,
      });
    }
  } catch {
    return [];
  }
  return out;
}
