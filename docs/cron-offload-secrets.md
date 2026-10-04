# Cron offload — GitHub Actions secrets checklist

All 18 scheduled jobs moved off Vercel (Fluid Active CPU was over quota) to free
GitHub Actions runners. The runners call the repo's own `src/lib/*` functions
via `scripts/crons/run-*.ts` and write straight to Neon Postgres — zero Vercel
compute. The `/api/cron/*` routes stay in place as manual/admin fallbacks
(auth: `Authorization: Bearer <CRON_SECRET>`, unchanged).

## Add these secrets in GitHub: repo → Settings → Secrets and variables → Actions → "New repository secret"

| Secret | Required by | Notes |
|---|---|---|
| `DATABASE_URL` | ALL 18 `cron-*.yml` workflows | Neon pooled connection string. `POSTGRES_URL` also accepted by the runner scripts. Without it, every job fails fast with a clear message. |
| `TELEGRAM_BOT_TOKEN` | `cron-scan.yml` only | Optional. Enables the post-scan Telegram digest (`/api/cron/scan` sent one too). If unset, the scan still runs and saves — it just skips the digest. |
| `TELEGRAM_CHAT_ID` | `cron-scan.yml` only | Optional. Chat/channel id the digest is sent to. Same behavior as the token: unset → digest skipped, scan unaffected. |
| `CRON_SECRET` | none of the scheduled workflows (documented for completeness) | Still locks the `/api/cron/*` fallback routes and the manual `run-all-crons.yml` workflow. Not needed by the scheduled `cron-*.yml` jobs because runners call library code directly, not HTTP endpoints. |

## Conditional extras (outside the standard set)

These two jobs are no-ops without their respective keys — the runner fails fast
with a clear message instead of half-working:

- `KIT_API_KEY` — needed by `cron-kit-sync.yml` only (tags new users in Kit).
  The Vercel cron had the same requirement. Add it as a GitHub secret if/when
  you want this job active.
- `DATA_GOV_IN_API_KEY` — needed by `cron-datagov.yml` only (personal key;
  the route returns 503 without it). Add it as a GitHub secret when you have a
  personal key; until then the job exits with "personal key not set".

## Schedules (all UTC, unchanged from the old vercel.json crons)

| Workflow | Schedule | What it does |
|---|---|---|
| cron-instruments-sync.yml | `0 3 * * 1` (weekly) | NSE instrument master sync |
| cron-benchmark-constituents.yml | `30 3 * * *` | NSE index constituent weights |
| cron-scrape-research.yml | `0 4 * * *` | Broker research report scraper |
| cron-52w-levels.yml | `5 10 * * 1-5` | 52-week high/low breadth levels |
| cron-options-flow.yml | `25 10 * * 1-5` | Options-flow snapshots (F&O universe) |
| cron-datagov.yml | `30 2 * * *` | data.gov.in tracked-dataset sync |
| cron-data360-catalog.yml | `0 2 * * 0` (weekly) | World Bank Data360 indicator catalog |
| cron-data360.yml | `45 3 * * *` | World Bank Data360 observation sync |
| cron-collect.yml | `15 3 * * *` | Macro/market series collectors |
| cron-what-changed.yml | `15 4 * * *` | "What changed" institutional shifts warm |
| cron-scan.yml | `30 11 * * 1-5` | Nifty 500 market scanner |
| cron-backtest.yml | `0 12 * * 6` (weekly) | Scanner backtest |
| cron-signals.yml | `45 11 * * 1-5` | AI signals |
| cron-kit-sync.yml | `30 5 * * *` | Kit `customers` tag backfill |
| cron-company-disclosures.yml | `0 6 * * *` | NSE announcements crawler + FinBERT |
| cron-reddit-sentiment.yml | `30 6 * * *` | Reddit retail sentiment refresh |
| cron-credit-ratings.yml | `45 4 * * *` | Credit ratings feed deep refresh |
| cron-promoter-disclosures.yml | `0 5 * * *` | Promoter disclosure feed deep refresh |

Every workflow also supports `workflow_dispatch` for manual runs from the
Actions tab.

## After merging

1. Add the secrets above.
2. Actions tab → run each workflow once via "Run workflow" and confirm green.
3. Confirm `vercel.json` has `"crons": []` on main (Vercel stops scheduling).
4. The admin panel (`/admin/system`) now lists GitHub Actions as the executor
   for all jobs.
5. Rollback: restore the old `vercel.json` crons array and revert — Vercel
   resumes scheduling on the next deploy.
