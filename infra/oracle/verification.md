# Oracle VM — per-job verification plan (no server access)

Every check below uses a **public site surface** or the **Neon SQL editor** —
nothing assumes SSH or any access to the VM. Check each job in the first 24 h
after launch, **before** disabling the GitHub workflow schedules (cutover
checklist step 4 in the README).

Times are IST (UTC+5:30) unless noted. Cron lines in `/etc/cron.d/mi` are UTC.

## 0. Heartbeat / instance liveness (check FIRST)

Neon SQL editor:
```sql
SELECT * FROM oracle_heartbeat ORDER BY ts DESC LIMIT 5;
```
- **Fresh:** a new row every ~5 min.
- **Stale:** no rows for **> 30 min** = investigate (VM down, cloud-init failed,
  or `DATABASE_URL` wrong/empty). Note the table is created by the heartbeat
  itself (`CREATE TABLE IF NOT EXISTS`), so an empty-but-existing table with
  no recent rows means the DB insert path is failing — the bash-side
  `/opt/mi/heartbeat.log` append would still be running on the VM, but you
  can't see it without SSH, so treat >30 min gaps as the incident signal.

## 1. trade-lab (`*/15 3-10 * * 1-5` ×4 slices + `10 10 * * 1-5` ×4, weekdays)

- **Page:** `https://getmarketintelligence.in/intelligence/trade-lab`
  — the freshness badge next to the symbol header reads **Live** (cache age
  < 5 min), **Delayed** (< 60 min), or **Stale — market closed or feed delayed**
  (≥ 60 min). During market hours (09:15–15:30 IST, Mon–Fri) an intraday
  timeframe should show **Live** or **Delayed**.
- **JSON (no login):** `https://getmarketintelligence.in/api/trade/lab?symbol=NIFTY&tf=15m`
  → fields `fetchedAt` (ms), `asOf` (epoch s), `stale` (bool). Fresh =
  `fetchedAt/1000 - asOf < 3600` and `stale: false` during market hours.
- **Staleness threshold:** intraday badge **Stale** during market hours, or
  `stale: true` on a weekday afternoon = the slices aren't warming the cache.
- The page also emits transition alerts (RSI 70/30, MACD flip, volume
  breakout) into the notification feed — same pipeline as the old route.

## 2. smart-notify (`*/30 * * * *`)

- **Bell:** signed in → notification bell → **"For you"** tab. Fresh =
  events timestamped within the last hour (JSON:
  `/api/notifications/smart` returns rows `ORDER BY at DESC LIMIT 120`).
- **Telegram:** owner chat receives smart-notification messages roughly
  every 30 min when detectors fire (quiet periods send nothing — no news can
  be healthy).
- **Staleness threshold:** "For you" tab's newest item older than **2 h**
  during a weekday = investigate. (Weekends/quiet markets legitimately produce
  fewer events; compare against the bell's "All" tab.)

## 3. collect / warm-feed-hub / stress / alerts (`0 */3 * * *` ×4)

- **`/markets`** — index/quote cards show current prices; during market hours
  values move between refreshes. Dead-flat prices on a weekday afternoon =
  collectors not writing.
- **`/data/health`** — per-source table with a **"last ok …m ago"** column
  and a "Collector errors" panel listing sources whose last run failed
  (previous values keep being served). Fresh = most sources < 3–4 h.
- **JSON:** `https://getmarketintelligence.in/api/health/sources`
  → `{ generatedAt, counts: {healthy, degraded, failing, unknown}, sources[] }`.
- **Alerts** (user alert rules) surface in the bell; **stress** feeds
  `/macro/stress` — both derive from the same 3-hour tick, so the health page
  covers them.

## 4. betas (`0 1 * * *` daily)

- **Pages:** `/macro/transmission` and `/macro/scenarios` ("Sector impact"
  panel: *"using the measured betas from the Transmission Map"*).
- **JSON:** `https://getmarketintelligence.in/api/transmission`
  → `{ betas: { windowStart, windowEnd, sectors[] }, today }`.
  Fresh = `windowEnd` is yesterday or today (2-year rolling OLS window,
  recomputed daily).
- **Staleness threshold:** `windowEnd` more than **2 trading days** old.

## 5. brief (`45 2 * * 1-5` pre, `30 10 * * 1-5` post, weekdays)

- **Page:** `https://getmarketintelligence.in/intelligence/brief`
  — header subtitle shows **"Pre-market · <date-time> IST"** or
  **"Post-close · <date-time> IST"** with a list of past briefs below.
- **Timing:** pre-market brief lands ~**08:15 IST** (02:45 UTC cron);
  post-close ~**16:00 IST** (10:30 UTC cron). A missing pre-market brief by
  09:00 IST on a weekday = investigate.
- **Telegram + email:** the owner Telegram chat gets the briefing; brief
  subscribers get the email (only if `RESEND_API_KEY` is set — otherwise
  sending is skipped gracefully and the page is the check).

## 6. competition-snapshot (`20 10 * * 1-5`, weekdays)

- **JSON:** `https://getmarketintelligence.in/api/competition/leaderboard`
  → `{ competition, rows, asOf }`. Fresh on a trading day = `asOf` dated
  **today after ~15:50 IST** (snapshot runs 10:20 UTC = 15:50 IST).
- **Page:** `/alpha-league` leaderboard reflects the day's closes.
- **SQL fallback:** `SELECT day, max(created_at) FROM competition_snapshots
  GROUP BY day ORDER BY day DESC LIMIT 5;` — today's trading day present =
  healthy. (The script exits 1 on non-trading days / before close — that's the
  route's old 409, not a failure.)

## 7. collectors (`30 0 * * *`, `30 12 * * *` daily)

- **`/data/health`** — per-collector "last ok" times; fresh = **06:00–07:00 IST**
  and **18:00–19:00 IST** runs visible (00:30 / 12:30 UTC cron + up to 35 min
  runtime).
- **`/api/health/sources`** — same data as JSON.
- Individual collectors degrade honestly: a missing optional key
  (`HF_TOKEN`, `APIFY_TOKEN`, `YOUTUBE_API_KEY`) shows as a recorded skip in
  `source_health`, never as fake data.

## 8. telegram-data-brief (`5 1 * * *`, `5 13 * * *`)

- **Telegram:** owner chat receives the market-data briefing at **~06:35 IST**
  and **~18:35 IST** daily (01:05 / 13:05 UTC cron — 35 min after the
  collectors start, giving them time to finish).
- **No double-send possible:** the endpoint dedups per AM/PM IST slot, so a
  re-run or overlap can never send twice.
- **Staleness threshold:** no briefing by **07:30 / 19:30 IST** = investigate
  (also check job 7 — the brief summarizes collector output).

## 9. After cutover — the double-run check

Once all 8 jobs above are verified fresh over 24 h, disable the 7 GitHub
workflow schedules (`trade-lab.yml`, `smart-notify.yml`, `collect.yml`,
`collectors.yml`, `betas.yml`, `brief.yml`, `alpha-league.yml`). Then watch
for **exactly one** Telegram briefing per slot and **one** brief email per
slot for another 24 h — duplicates mean a schedule is still live somewhere.
The 17 DB-direct workflows (`cron-*.yml`, `run-all-crons.yml`) stay enabled.
The Vercel `/api/cron/*` routes stay deployed as manual fallbacks.
