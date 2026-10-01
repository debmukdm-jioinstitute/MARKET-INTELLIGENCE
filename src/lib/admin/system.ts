/** Static registry of scheduled jobs, required env vars and admin kill switches shown on /admin/system. */
export const CRONS = [
  { path: "/api/cron/collect", schedule: "15 3 * * * (Vercel) + every 3h (GitHub)", source: "Vercel + GitHub", what: "Macro/market series collector" },
  { path: "/api/cron/what-changed", schedule: "15 4 * * *", source: "Vercel", what: "Home “What changed” institutional shifts panel" },
  { path: "/api/cron/stress", schedule: "every 3h (GitHub)", source: "GitHub Actions", what: "Stress-index history" },
  { path: "/api/cron/alerts", schedule: "every 3h (GitHub)", source: "GitHub Actions", what: "Evaluate user alert rules" },
  { path: "/api/cron/betas", schedule: "0 1 * * * (GitHub)", source: "GitHub Actions", what: "Factor betas refresh" },
  { path: "/api/cron/brief", schedule: "45 2 & 30 10 weekdays (GitHub)", source: "GitHub Actions", what: "Daily brief + email delivery" },
  { path: "/api/cron/scrape-research", schedule: "0 4 * * *", source: "Vercel", what: "Broker research report scraper" },
  { path: "/api/cron/options-flow", schedule: "25 10 * * 1-5", source: "Vercel", what: "Options-flow snapshots" },
  { path: "/api/cron/datagov", schedule: "30 2 * * *", source: "Vercel", what: "data.gov.in sync" },
  { path: "/api/cron/data360/catalog", schedule: "0 2 * * 0", source: "Vercel", what: "World Bank Data360 indicator catalog" },
  { path: "/api/cron/data360", schedule: "45 3 * * *", source: "Vercel", what: "World Bank Data360 observation sync (resumable)" },
  { path: "/api/cron/scan", schedule: "30 11 * * 1-5", source: "Vercel", what: "Market scanner" },
  { path: "/api/cron/signals", schedule: "45 11 * * 1-5", source: "Vercel", what: "AI signals" },
  { path: "/api/cron/backtest", schedule: "0 12 * * 6", source: "Vercel", what: "Weekly backtest" },
  { path: "/api/cron/52w-levels", schedule: "5 10 * * 1-5 (Vercel, ~5m budget)", source: "Vercel", what: "52-week high/low levels for breadth" },
  { path: "/api/portfolio/instruments/cron-sync", schedule: "0 3 * * 1", source: "Vercel", what: "NSE instrument master sync" },
  {
    path: "/api/cron/benchmark-constituents",
    schedule: "30 3 * * *",
    source: "Vercel",
    what: "NSE index constituent lists + cap-weight proxy for portfolio Brinson/active share",
  },
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
  { key: "NEXT_PUBLIC_RAZORPAY_KEY_ID", required: false, note: "Razorpay Standard Checkout — public key id (test or live)" },
  { key: "RAZORPAY_KEY_SECRET", required: false, note: "Razorpay secret — server order + payment verify only" },
  { key: "RAZORPAY_PRO_MONTHLY_PAISE", required: false, note: "Override Pro monthly amount in paise (default 49900)" },
  { key: "RAZORPAY_PRO_ANNUAL_PAISE", required: false, note: "Override Pro annual amount in paise (default 499900)" },
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
