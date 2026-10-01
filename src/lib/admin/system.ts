/** Static registry of scheduled jobs, required env vars and admin kill switches shown on /admin/system. */
/* Note: scheduled computation moved OFF Vercel in Oct 2026 (Fluid Active CPU
   was over the Hobby quota: 5h 40m / 4h). All heavy jobs now run on free
   GitHub Actions runners and write straight to Neon — Vercel does ~0 scheduled
   compute. The /api/cron/* routes below remain as manual/admin fallbacks only. */
export const CRONS = [
  { path: "collectors.yml → POST /api/collector/ingest", schedule: "0 */3 * * * (GitHub)", source: "GitHub Actions", what: "Macro/market series collector — fetch half on the runner, then ingest" },
  { path: "/api/cron/telegram-data-brief (triggered by collectors.yml)", schedule: "05:30 + 17:30 IST briefing slots", source: "GitHub Actions", what: "All-series market data briefing to Telegram (per-slot dedup)" },
  { path: "/api/cron/warm-feed-hub", schedule: "0 */3 * * * (GitHub)", source: "GitHub Actions", what: "Unified feed hub refresh + per-source health into Postgres" },
  { path: "/api/cron/stress", schedule: "0 */3 * * * (GitHub)", source: "GitHub Actions", what: "Stress-index history" },
  { path: "/api/cron/alerts", schedule: "0 */3 * * * (GitHub)", source: "GitHub Actions", what: "Evaluate user alert rules" },
  { path: "/api/cron/betas", schedule: "0 1 * * * (GitHub)", source: "GitHub Actions", what: "Factor betas refresh" },
  { path: "/api/cron/brief", schedule: "45 2 & 30 10 weekdays (GitHub)", source: "GitHub Actions", what: "Daily brief + email delivery" },
  { path: "cron-scrape-research.yml → scripts/crons/run-scrape-research.ts", schedule: "0 4 * * * (GitHub)", source: "GitHub Actions", what: "Broker research report scraper" },
  { path: "cron-options-flow.yml → scripts/crons/run-options-flow.ts", schedule: "25 10 * * 1-5 (GitHub)", source: "GitHub Actions", what: "Options-flow snapshots" },
  { path: "cron-datagov.yml → scripts/crons/run-datagov.ts", schedule: "30 2 * * * (GitHub)", source: "GitHub Actions", what: "data.gov.in sync" },
  { path: "cron-data360-catalog.yml → scripts/crons/run-data360-catalog.ts", schedule: "0 2 * * 0 (GitHub)", source: "GitHub Actions", what: "World Bank Data360 indicator catalog" },
  { path: "cron-data360.yml → scripts/crons/run-data360.ts", schedule: "45 3 * * * (GitHub)", source: "GitHub Actions", what: "World Bank Data360 observation sync (resumable)" },
  { path: "cron-scan.yml → scripts/crons/run-scan.ts", schedule: "30 11 * * 1-5 (GitHub)", source: "GitHub Actions", what: "Market scanner (Nifty 500, + Telegram digest)" },
  { path: "cron-signals.yml → scripts/crons/run-signals.ts", schedule: "45 11 * * 1-5 (GitHub)", source: "GitHub Actions", what: "AI signals" },
  { path: "cron-backtest.yml → scripts/crons/run-backtest.ts", schedule: "0 12 * * 6 (GitHub)", source: "GitHub Actions", what: "Weekly backtest" },
  { path: "cron-52w-levels.yml → scripts/crons/run-52w-levels.ts", schedule: "5 10 * * 1-5 (GitHub, 20m budget)", source: "GitHub Actions", what: "52-week high/low levels for breadth" },
  { path: "cron-instruments-sync.yml → scripts/crons/run-instruments-sync.ts", schedule: "0 3 * * 1 (GitHub)", source: "GitHub Actions", what: "NSE instrument master sync" },
  {
    path: "cron-benchmark-constituents.yml → scripts/crons/run-benchmark-constituents.ts",
    schedule: "30 3 * * * (GitHub)",
    source: "GitHub Actions",
    what: "NSE index constituent lists + cap-weight proxy for portfolio Brinson/active share",
  },
  { path: "cron-what-changed.yml → scripts/crons/run-what-changed.ts", schedule: "15 4 * * * (GitHub)", source: "GitHub Actions", what: "Home “What changed” institutional shifts panel rebuild" },
  { path: "cron-kit-sync.yml → scripts/crons/run-kit-sync.ts", schedule: "30 5 * * * (GitHub)", source: "GitHub Actions", what: "Kit `customers` tag sync (backfill, idempotent)" },
] as const;

export const ENV_VARS: { key: string; required: boolean; note: string }[] = [
  { key: "DATABASE_URL", required: true, note: "Neon Postgres (POSTGRES_URL also accepted)" },
  { key: "AUTH_SECRET", required: true, note: "Session signing (SESSION_SECRET also accepted)" },
  { key: "CRON_SECRET", required: true, note: "Locks every /api/cron/* route" },
  { key: "ADMIN_EMAILS", required: true, note: "Who gets the admin role" },
  { key: "GROQ_API_KEY", required: true, note: "AI desk, copilot, brief" },
  { key: "RESEND_API_KEY", required: false, note: "Welcome email, signup OTP, newsletters, brief" },
  { key: "RESEND_FROM_EMAIL", required: false, note: "Verified sender — e.g. onboarding@getmarketintelligence.in (see docs/RESEND.md)" },
  { key: "VAPID_PUBLIC_KEY", required: false, note: "Web push" },
  { key: "VAPID_PRIVATE_KEY", required: false, note: "Web push" },
  { key: "UPSTOX_ACCESS_TOKEN", required: false, note: "Live Upstox quotes / option chain" },
  { key: "FRED_API_KEY", required: false, note: "Macro series" },
  { key: "DATA_GOV_IN_API_KEY", required: false, note: "data.gov.in" },
  { key: "SCANNER_INGEST_SECRET", required: false, note: "Scanner/backtest ingest endpoint" },
  { key: "MCP_API_KEYS", required: false, note: "Optional — higher MCP rate limits for automation (public MCP is open without keys)" },
  { key: "ADMIN_SYNC_SECRET", required: false, note: "Manual instrument sync" },
  { key: "NEXT_PUBLIC_SITE_URL", required: false, note: "Absolute links in emails" },
  { key: "MI_REQUIRE_ACCOUNT", required: false, note: "Set to 1 or true to disable guest login without DB toggle (admin flag still works)" },
  { key: "FEED_USER_AGENT", required: false, note: "User-Agent for RSS and other open feeds" },
  { key: "REDDIT_CLIENT_ID", required: false, note: "Reddit app id — oauth.reddit.com (fixes retail sentiment 403 on Vercel)" },
  { key: "REDDIT_CLIENT_SECRET", required: false, note: "Reddit app secret" },
  { key: "REDDIT_REFRESH_TOKEN", required: false, note: "Long-lived OAuth refresh token (recommended)" },
  { key: "REDDIT_USERNAME", required: false, note: "Script-app fallback with REDDIT_PASSWORD" },
  { key: "REDDIT_PASSWORD", required: false, note: "Script-app fallback password" },
  { key: "REDDIT_USER_AGENT", required: false, note: "Reddit API User-Agent (platform:appId:version)" },
];

export const FLAGS = [
  { flag: "ai", label: "AI features (AI desk, options-flow AI, copilot)" },
  { flag: "broker-import", label: "Broker holdings import" },
  { flag: "scenario", label: "Scenario engine" },
  { flag: "guided-tour", label: "Show guided tour to users (disabled by default)", defaultEnabled: false },
  {
    flag: "require-account",
    label: "Require sign-up (disable guest login)",
    defaultEnabled: false,
    catalog: false,
  },
  { flag: "signup-otp", label: "Email OTP on sign-up (verification code)", catalog: false },
] as const;

export function defaultFlagEnabled(flag: string): boolean {
  const row = FLAGS.find((f) => f.flag === flag);
  if (!row) return true;
  return "defaultEnabled" in row ? row.defaultEnabled : true;
}

export function catalogFlags() {
  return FLAGS.filter((f) => !("catalog" in f) || f.catalog !== false);
}
