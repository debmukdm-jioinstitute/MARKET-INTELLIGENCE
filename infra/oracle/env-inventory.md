# Oracle VM — environment variable inventory

Exact, grep-verified inventory of every env var the 11 `scripts/oracle/*.ts`
runners (plus `heartbeat.ts`) read from `process.env`. The VM reads env ONLY
from `/opt/mi/.env`, which `user-data.sh` writes from its SECRETS section —
there is no dotenv dependency anywhere.

**Deliberately NOT on the VM:** `CRON_SECRET`. It existed only to lock the
HTTP `/api/cron/*` routes (Bearer <CRON_SECRET>); the oracle runners perform the same
work in-process with no HTTP layer, so there is nothing to authenticate.
Do not put it in the SECRETS section.

**Also not needed on the VM** (Vercel/web-only): `AUTH_SECRET`,
`ADMIN_EMAILS`, `GROQ_API_KEY`, `KIT_API_KEY`, `KIT_FORM_ID`, Razorpay keys,
Reddit OAuth vars, `FRED_API_KEY`, `DATA_GOV_IN_API_KEY`, `SCANNER_INGEST_SECRET`.
Those stay on Vercel / GitHub Actions where the 17 DB-direct workflows still run.

Legend: ✅ required · 🟡 optional (job degrades gracefully — skip or leave `PASTE_HERE`).

## 1. Database

| Var | Need | Jobs | Copy from |
|-----|------|------|-----------|
| `DATABASE_URL` ✅ (or `POSTGRES_URL` / `DATABASE_URL_UNPOOLED` — any one) | required | **all** jobs except warm-feed-hub | Vercel dashboard → MARKET-INTELLIGENCE → Settings → Environment Variables → Production → copy the value (it is the Neon connection string). Fallback source: Neon dashboard → project → Connect → connection string (pooled is fine) |

Without it every job logs a JSON warning and exits 0 — nothing crash-loops,
but nothing is written either. `run-warm-feed-hub` is the exception: the warm
itself runs without a DB; only the best-effort source-health recording no-ops
(mirrors the route, which has no DB guard).

## 2. Telegram

| Var | Need | Jobs | Copy from |
|-----|------|------|-----------|
| `TELEGRAM_BOT_TOKEN` 🟡 | optional | run-trade-lab (owner digest), run-alerts (digests), run-telegram-data-brief (the briefing itself) | Vercel env (bot `@market_intel_alerts_india_bot`; token originally from @BotFather) |
| `TELEGRAM_CHAT_ID` 🟡 (or `TELEGRAM_CHAT_IDS`, comma-separated) | optional | same as above | Vercel env (owner chat id; `TELEGRAM_CHAT_IDS` wins if both set) |

Without these, Telegram sends are silent no-ops (`broadcastTelegram` returns
`ok:false` without throwing; the data-brief endpoint returns
`skipped:"unconfigured"`). Compute, caching and DB writes all still run.

## 3. Email (Resend)

| Var | Need | Jobs | Copy from |
|-----|------|------|-----------|
| `RESEND_API_KEY` 🟡 | optional | run-alerts (email digests), run-brief (brief sending) | Vercel env |
| `RESEND_FROM_EMAIL` 🟡 | optional | run-alerts, run-brief | Vercel env (verified sender, e.g. `onboarding@getmarketintelligence.in` — see `docs/email-deliverability-audit.md` for the send-subdomain status) |

Without these, sending is skipped gracefully (mirrors the routes'
`"RESEND_API_KEY not configured"` skip path).

| Var | Need | Jobs | Copy from |
|-----|------|------|-----------|
| `NEXT_PUBLIC_SITE_URL` 🟡 | optional | run-trade-lab (deep links in Telegram event messages), run-brief (unsubscribe links), `@/lib/notify/telegram` siteUrl() | Vercel env; **the lib defaults to `https://getmarketintelligence.in`** when unset — leave `PASTE_HERE` unless the domain changes |

## 4. Web push (VAPID)

| Var | Need | Jobs | Copy from |
|-----|------|------|-----------|
| `VAPID_PUBLIC_KEY` 🟡 | optional | run-smart-notify (push delivery), run-trade-lab (device push for "high"-severity events — trade-lab detectors emit medium/info only) | Vercel env (the pair was generated for web-push; see `src/lib/admin/push.ts`) |
| `VAPID_PRIVATE_KEY` 🟡 | optional | same as above | Vercel env |

Both must be set for push to work; when unset, detection and the bell feed
still run, only device-push delivery is skipped.

## 5. Market-data source keys

| Var | Need | Jobs | Copy from |
|-----|------|------|-----------|
| `UPSTOX_ACCESS_TOKEN` 🟡 | optional | run-trade-lab (Upstox candle source) | Vercel env if already set there; otherwise generate at <https://account.upstox.com/developer/apps#analytics> |
| `HF_TOKEN` 🟡 | optional | run-collect, run-collectors (broker-call tone, filing taxonomy, concall tone, sentiment models) | HuggingFace account → Settings → Access Tokens |
| `APIFY_TOKEN` 🟡 | optional | run-collect, run-collectors (Google Trends via the Apify actor) | Apify Console → Settings → Integrations |
| `YOUTUBE_API_KEY` 🟡 | optional | run-collect, run-collectors (YouTube comment sentiment) | Google Cloud Console → Credentials (YouTube Data API v3) |
| `BLS_API_KEY` 🟡 | optional | run-collect, run-collectors (BLS macro series) | BLS developer portal |
| `FEED_USER_AGENT` 🟡 | optional | run-trade-lab, run-collect, run-collectors (HTTP User-Agent for RSS/open feeds) | Vercel env, or any descriptive string |

### ⚠️ UPSTOX flag — NO daily refresh needed

Grep-verified in `src/lib/feeds/sources/upstox/client.ts`: the code expects a
**free 1-year read-only "Analytics Token"** — *"no daily re-login, unlike a
normal Upstox trading OAuth token"*. Generate once at
<https://account.upstox.com/developer/apps#analytics> and it is valid for a
year. When unset, trade-lab falls back to Yahoo Finance candles
(`src/lib/trade-lab/data.ts`); only BANKEX history is Upstox-exclusive.

Each collector **degrades honestly** without its key (records the skip in
`collected_series` / `source_health`, never fakes data).

## 6. Per-collector budget / backfill knobs (all 🟡 — leave `PASTE_HERE` to accept defaults)

Only set these if you deliberately want to tune a collector. Defaults are the
code values; `user-data.sh` skips any knob left as `PASTE_HERE`.

| Var | Default in code | Effect |
|-----|-----------------|--------|
| `SHAREHOLDING_BUDGET_MS` | `8 * 60_000` (8 min) | shareholding collector wall budget |
| `SHAREHOLDING_XBRL_CAP` | `300` | XBRL docs parsed per run |
| `SHAREHOLDING_SYMBOLS` | `""` (all due) | comma-separated symbol subset |
| `SHAREHOLDING_FULL` | off | `= "1"` forces full-universe pass |
| `SENTIMENT_BUDGET_MS` | `9 * 60_000` (9 min) | sentiment collector wall budget |
| `SENTIMENT_SCORE_CAP` | `500` | max items scored per run |
| `SENTIMENT_YT_SYMBOLS` | `30` | YouTube symbol cap |
| `SENTIMENT_GDELT_SYMBOLS` | `20` | GDELT symbol cap |
| `CONCALL_BUDGET_MS` | `8 * 60_000` (8 min) | concall collector wall budget |
| `CONCALL_MAX_PER_RUN` | `8` | concalls summarized per run |
| `CONCALL_LOOKBACK_DAYS` | `3` | lookback window (days) |
| `CREDIT_RATINGS_BUDGET_MS` | `12 * 60_000` (12 min) | credit-ratings wall budget |
| `CREDIT_RATINGS_SYMBOLS` | `""` (all due) | comma-separated symbol subset |
| `CREDIT_RATINGS_FORCE` | off | `= "1"` forces deep refresh |
| `IPOS_BUDGET_MS` | `6 * 60_000` (6 min) | IPO collector wall budget |
| `IPOS_DRHP_MAX` | `3` | DRHP docs parsed per run |
| `TRENDS_BATCH` | `80` | Google Trends batch size |
| `TRENDS_MAX_SPEND_USD` | `1` | Apify spend cap per run |
| `TRENDS_FORCE` | off | `= "1"` ignores last-run watermark |
| `LEGAL_RISK_FORCE` | off | `= "1"` forces legal-risk refresh |

## 7. Runner-specific knobs

| Var | Need | Jobs | Notes |
|-----|------|------|-------|
| `ONLY` 🟡 | optional | run-collectors | fallback for `--only` (comma-separated collector subset, same as the Actions version's `inputs.only`) |
| `COMPETITION_MIN_PRICE` 🟡 | optional | run-competition-snapshot | trade-lab pricing floor; default `20` in code |

## Quick checklist for the SECRETS paste

Minimum for a working VM: **`DATABASE_URL` only.** Everything else degrades
gracefully. Sensible full paste: `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_CHAT_ID`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`,
`NEXT_PUBLIC_SITE_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`UPSTOX_ACCESS_TOKEN`, `HF_TOKEN`, `APIFY_TOKEN`, `YOUTUBE_API_KEY`,
`BLS_API_KEY`, `FEED_USER_AGENT`. Leave every budget knob `PASTE_HERE`.
