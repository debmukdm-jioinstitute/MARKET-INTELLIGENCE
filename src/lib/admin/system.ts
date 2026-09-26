/** Static registry of scheduled jobs, required env vars and admin kill switches shown on /admin/system. */
export const CRONS = [
  { path: "/api/cron/collect", schedule: "15 3 * * * (Vercel) + every 3h (GitHub)", source: "Vercel + GitHub", what: "Macro/market series collector" },
  { path: "/api/cron/stress", schedule: "every 3h (GitHub)", source: "GitHub Actions", what: "Stress-index history" },
  { path: "/api/cron/alerts", schedule: "every 3h (GitHub)", source: "GitHub Actions", what: "Evaluate user alert rules" },
  { path: "/api/cron/betas", schedule: "0 1 * * * (GitHub)", source: "GitHub Actions", what: "Factor betas refresh" },
  { path: "/api/cron/brief", schedule: "45 2 & 30 10 weekdays (GitHub)", source: "GitHub Actions", what: "Daily brief + email delivery" },
  { path: "/api/cron/scrape-research", schedule: "0 4 * * *", source: "Vercel", what: "Broker research report scraper" },
  { path: "/api/cron/options-flow", schedule: "45 10 * * 1-5", source: "Vercel", what: "Options-flow snapshots" },
  { path: "/api/cron/datagov", schedule: "30 2 * * *", source: "Vercel", what: "data.gov.in sync" },
  { path: "/api/cron/prowess", schedule: "30 4 * * *", source: "Vercel", what: "CMIE Prowess sync" },
  { path: "/api/cron/scan", schedule: "30 11 * * 1-5", source: "Vercel", what: "Market scanner" },
  { path: "/api/cron/signals", schedule: "45 11 * * 1-5", source: "Vercel", what: "AI signals" },
  { path: "/api/cron/backtest", schedule: "0 12 * * 6", source: "Vercel", what: "Weekly backtest" },
  { path: "/api/portfolio/instruments/cron-sync", schedule: "0 3 * * 1", source: "Vercel", what: "NSE instrument master sync" },
] as const;

export const ENV_VARS: { key: string; required: boolean; note: string }[] = [
  { key: "DATABASE_URL", required: true, note: "Neon Postgres (POSTGRES_URL also accepted)" },
  { key: "AUTH_SECRET", required: true, note: "Session signing (SESSION_SECRET also accepted)" },
  { key: "CRON_SECRET", required: true, note: "Locks every /api/cron/* route" },
  { key: "ADMIN_EMAILS", required: true, note: "Who gets the admin role" },
  { key: "GROQ_API_KEY", required: true, note: "AI desk, copilot, brief" },
  { key: "RESEND_API_KEY", required: false, note: "Newsletters / brief email" },
  { key: "VAPID_PUBLIC_KEY", required: false, note: "Web push" },
  { key: "VAPID_PRIVATE_KEY", required: false, note: "Web push" },
  { key: "UPSTOX_ACCESS_TOKEN", required: false, note: "Live Upstox quotes / option chain" },
  { key: "FRED_API_KEY", required: false, note: "Macro series" },
  { key: "DATA_GOV_IN_API_KEY", required: false, note: "data.gov.in" },
  { key: "PROWESS_API_KEY", required: false, note: "CMIE Prowess" },
  { key: "PROWESS_INGEST_SECRET", required: false, note: "Prowess/scanner ingest endpoints" },
  { key: "MCP_API_KEYS", required: false, note: "/api/mcp clients" },
  { key: "ADMIN_SYNC_SECRET", required: false, note: "Manual instrument sync" },
  { key: "NEXT_PUBLIC_SITE_URL", required: false, note: "Absolute links in emails" },
];

export const FLAGS = [
  { flag: "ai", label: "AI features (AI desk, options-flow AI, copilot)" },
  { flag: "broker-import", label: "Broker holdings import" },
  { flag: "scenario", label: "Scenario engine" },
  { flag: "chatwith", label: "Chatwith embed (floating terminal chatbot on all pages)" },
] as const;
