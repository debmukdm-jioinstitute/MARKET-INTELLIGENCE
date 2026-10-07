import { requireAdmin } from "@/lib/admin/guard";
import { classify, maxAgeDays, type Freshness } from "@/lib/collector/freshness";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type SeriesRow = {
  id: string;
  label: string;
  unit: string;
  category: string;
  provider: string;
  url: string;
  last_ok: string | null;
  last_error: string | null;
  last_run: string | null;
  latest_date: string | null;
  obs_count: number;
};

const COUNT_TABLES = [
  "users",
  "collected_series",
  "collected_obs",
  "stress_history",
  "scan_latest",
  "xp_events",
  "daily_engagement",
  "referrals",
  "datagov_sync_log",
  "datagov_records",
  "data360_sync_log",
  "research_scrape_log",
  "cron_run_log",
  "alert_rules",
  "alert_events",
  "newsletters",
  "newsletter_subscribers",
  "push_subscriptions",
  "razorpay_orders",
  "daily_briefs",
  "options_flow_snapshots",
  "reddit_sentiment_cache",
  "source_health",
  "analytics_events",
];

/** name, UTC cron, description, transport */
const WORKFLOWS: { name: string; schedule: string; what: string; via: string }[] = [
  { name: "collect-market-data", schedule: "0 */3 * * *", what: "Collector pipeline + feed-hub warm + stress snapshot + alert rules", via: "Vercel routes" },
  { name: "cron-collect", schedule: "15 3 * * *", what: "DB-direct collector pipeline (scripts/crons/run-collect.ts)", via: "GitHub Actions → Neon" },
  { name: "cron-scan", schedule: "30 11 * * 1-5", what: "Nifty 500 scan (scripts/crons/run-scan.ts)", via: "GitHub Actions → Neon" },
  { name: "cron-signals", schedule: "45 11 * * 1-5", what: "Nifty signals model (scripts/crons/run-signals.ts)", via: "GitHub Actions → Neon" },
  { name: "cron-options-flow", schedule: "25 10 * * 1-5", what: "F&O data agent baseline (scripts/crons/run-options-flow.ts)", via: "GitHub Actions → Neon" },
  { name: "cron-datagov", schedule: "30 2 * * *", what: "data.gov.in row sync (scripts/crons/run-datagov.ts)", via: "GitHub Actions → Neon" },
  { name: "cron-data360", schedule: "45 3 * * *", what: "World Bank Data360 sync (scripts/crons/run-data360.ts)", via: "GitHub Actions → Neon" },
  { name: "cron-data360-catalog", schedule: "0 2 * * 0", what: "Data360 catalog refresh (weekly Sun)", via: "GitHub Actions → Neon" },
  { name: "cron-scrape-research", schedule: "0 4 * * *", what: "Research scrape (scripts/crons/run-scrape-research.ts)", via: "GitHub Actions → Neon" },
  { name: "cron-reddit-sentiment", schedule: "30 6 * * *", what: "Reddit sentiment (scripts/crons/run-reddit-sentiment.ts)", via: "GitHub Actions → Neon" },
  { name: "cron-kit-sync", schedule: "30 5 * * *", what: "Kit customer tag backfill (scripts/crons/run-kit-sync.ts)", via: "GitHub Actions → Neon" },
  { name: "cron-52w-levels", schedule: "5 10 * * 1-5", what: "52-week levels (scripts/crons/run-52w-levels.ts)", via: "GitHub Actions → Neon" },
  { name: "cron-backtest", schedule: "0 12 * * 6", what: "Backtest batch (weekly Sat)", via: "GitHub Actions → Neon" },
  { name: "cron-benchmark-constituents", schedule: "30 3 * * *", what: "Benchmark constituents sync", via: "GitHub Actions → Neon" },
  { name: "cron-company-disclosures", schedule: "0 6 * * *", what: "Company disclosures", via: "GitHub Actions → Neon" },
  { name: "cron-credit-ratings", schedule: "45 4 * * *", what: "Credit ratings feed", via: "GitHub Actions → Neon" },
  { name: "cron-instruments-sync", schedule: "0 3 * * 1", what: "NSE instruments sync (weekly Mon)", via: "GitHub Actions → Neon" },
  { name: "cron-promoter-disclosures", schedule: "0 5 * * *", what: "Promoter disclosures", via: "GitHub Actions → Neon" },
  { name: "cron-what-changed", schedule: "15 4 * * *", what: "What-changed digest", via: "GitHub Actions → Neon" },
];

function viewFor(s: { id: string; category: string; provider: string }): string {
  const id = s.id.toLowerCase();
  if (id.includes("stress")) return "/macro/stress";
  if (id.includes("options") || s.category === "options") return "/research/options-flow";
  if (id.includes("scan")) return "/research/scanner";
  if (s.provider === "datagov" || id.startsWith("datagov")) return "/data/feeds";
  if (s.provider === "data360" || id.startsWith("data360")) return "/data/feeds";
  if (id.includes("ipo")) return "/research/ipo";
  if (s.category === "macro" || /^(in_|rbi_|us_|cboe_|eurusd|ecb_|ea_|cot_|amfi_|damodaran_)/.test(id)) return "/macro";
  return "/markets";
}

const JOB_VIEW: Record<string, string> = {
  collect: "/data/feeds",
  "warm-feed-hub": "/",
  stress: "/macro/stress",
  alerts: "/intelligence/alerts",
  scan: "/research/scanner",
  signals: "/research/scanner",
  "options-flow": "/research/options-flow",
  brief: "/intelligence/brief",
  datagov: "/data/feeds",
  data360: "/data/feeds",
};

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!hasDatabase()) return NextResponse.json({ ok: false, error: "No database configured" }, { status: 503 });

  const db = sql();
  const out: Record<string, unknown> = { ok: true, generatedAt: new Date().toISOString() };

  // 1. collected_series with freshness classification
  try {
    await ensureSchema();
    const rows = (await db`
      SELECT s.id, s.label, s.unit, s.category, s.provider, s.url,
             s.last_ok, s.last_error, s.last_run,
             (SELECT max(obs_date) FROM collected_obs o WHERE o.series_id = s.id) AS latest_date,
             (SELECT count(*) FROM collected_obs o WHERE o.series_id = s.id) AS obs_count
      FROM collected_series s ORDER BY s.category, s.id
    `) as (SeriesRow & { obs_count: string })[];
    const now = Date.now();
    out.series = rows.map((r) => {
      const row = { ...r, obs_count: Number(r.obs_count) || 0 };
      let status: Freshness;
      try {
        status = classify(row, now);
      } catch {
        status = "pending";
      }
      return { ...row, status, maxAgeDays: maxAgeDays(r.id), view: viewFor(r) };
    });
  } catch (e) {
    out.series = [];
    out.seriesError = e instanceof Error ? e.message : String(e);
  }

  // 2-5. sync logs + scan latest
  const latest = async (q: string) => {
    try {
      return (await db.unsafe(q)) as unknown as Record<string, unknown>[];
    } catch {
      return [];
    }
  };
  const [datagovLog, data360Log, scrapeLog, scanLatest] = await Promise.all([
    latest(`SELECT kind, ok, rows, error, ran_at FROM datagov_sync_log ORDER BY ran_at DESC LIMIT 8`),
    latest(`SELECT kind, ok, rows, error, ran_at FROM data360_sync_log ORDER BY ran_at DESC LIMIT 8`),
    latest(`SELECT source, ok, items_found, error, ran_at FROM research_scrape_log ORDER BY ran_at DESC LIMIT 10`),
    latest(`SELECT id, run_at, (data->>'scanned')::int AS scanned FROM scan_latest ORDER BY run_at DESC LIMIT 3`),
  ]);
  out.datagovLog = datagovLog;
  out.data360Log = data360Log;
  out.scrapeLog = scrapeLog;
  out.scanLatest = scanLatest;

  // 6. cron run journal (last 20)
  try {
    const runs = (await db`
      SELECT id, job_name, started_at, finished_at, status, rows_written, error, trigger,
             EXTRACT(EPOCH FROM (COALESCE(finished_at, now()) - started_at)) AS duration_s
      FROM cron_run_log ORDER BY started_at DESC LIMIT 20
    `) as Record<string, unknown>[];
    out.cronRuns = runs.map((r) => ({ ...r, view: JOB_VIEW[String(r.job_name)] ?? null }));
  } catch {
    out.cronRuns = [];
  }

  // 7. per-table row counts (each guarded)
  const counts: Record<string, number | null> = {};
  await Promise.all(
    COUNT_TABLES.map(async (t) => {
      try {
        const rows = (await db.unsafe(`SELECT count(*)::int AS c FROM ${t}`)) as unknown as { c: number }[];
        counts[t] = rows[0]?.c ?? 0;
      } catch {
        counts[t] = null;
      }
    }),
  );
  out.tableCounts = counts;

  // 8. workflow schedule reference
  out.workflows = WORKFLOWS;
  out.note =
    "DB-direct GitHub Actions script runs (run-*.ts) do not hit Vercel routes, so they don't appear in cron_run_log — check Actions tab for those.";

  return NextResponse.json(out);
}
