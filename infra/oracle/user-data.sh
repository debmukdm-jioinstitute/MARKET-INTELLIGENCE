#!/bin/bash
# =============================================================================
# Market Intelligence — Oracle Always Free VM bootstrap (cloud-init user-data)
# -----------------------------------------------------------------------------
# HOW TO USE:
#   1. Fill in the SECRETS section below (replace every PASTE_HERE you need).
#      The copy committed to the public repo must contain ONLY placeholders —
#      never commit real values.
#   2. OCI Console → Compute → Create instance → Advanced options → Management
#      → Initialization script (cloud-init) → paste this whole file → Create.
#   3. cloud-init runs this ONCE at first boot (~5-10 min). NO SSH needed:
#      everything is verified afterwards from the Neon SQL editor + the site.
#
# WHAT IT DOES:
#   - logs everything to /var/log/mi-setup.log
#   - installs Node 22 (NodeSource, ARM64), git, cron, logrotate
#   - creates user `mi`, dirs /opt/mi/{repo,logs,bin}
#   - writes /opt/mi/.env from the SECRETS section (chmod 600, chown mi:mi)
#   - clones the repo, runs `npm ci`
#   - installs /opt/mi/bin/run.sh (cron job wrapper) + heartbeat-wrapper.sh
#   - installs /etc/cron.d/mi with the full job schedule (UTC)
#   - installs logrotate for the job logs
#
# The script is idempotent-ish: re-running it pulls latest main and reinstalls
# cleanly instead of failing on existing users/dirs/repos/cron files.
# =============================================================================

# --- log EVERYTHING ---
exec > >(tee -a /var/log/mi-setup.log) 2>&1
set -u
echo "[mi-setup] starting at $(date -u +%FT%TZ)"

# ============================ SECRETS — FILL THESE ============================
# Replace PASTE_HERE with real values before pasting into the OCI console.
# See infra/oracle/env-inventory.md for exactly where each value comes from.
# Leave OPTIONAL ones as PASTE_HERE — each job degrades gracefully without
# its key (nothing crashes; the feature is skipped or falls back).

DATABASE_URL="PASTE_HERE"              # REQUIRED — Neon Postgres connection string
                                       # (pooled URL is fine; POSTGRES_URL also accepted)

TELEGRAM_BOT_TOKEN="PASTE_HERE"        # optional — owner Telegram digests (bot token from @BotFather)
TELEGRAM_CHAT_ID="PASTE_HERE"          # optional — owner chat id (TELEGRAM_CHAT_IDS for several, comma-separated)

RESEND_API_KEY="PASTE_HERE"            # optional — brief + alert emails
RESEND_FROM_EMAIL="PASTE_HERE"         # optional — verified sender, e.g. onboarding@getmarketintelligence.in

NEXT_PUBLIC_SITE_URL="https://getmarketintelligence.in"  # optional — absolute links in emails/Telegram
                                       # (the lib defaults to this anyway; only change if the domain changes)

VAPID_PUBLIC_KEY="PASTE_HERE"          # optional — web-push delivery of smart notifications
VAPID_PRIVATE_KEY="PASTE_HERE"         # optional — web-push delivery of smart notifications

UPSTOX_ACCESS_TOKEN="PASTE_HERE"       # optional — Upstox 1-year read-only ANALYTICS token
                                       # (NOT the daily trading OAuth token; generate at
                                       #  https://account.upstox.com/developer/apps#analytics).
                                       # Falls back to Yahoo Finance candles when unset.

HF_TOKEN="PASTE_HERE"                  # optional — Hugging Face token (collector ML enrichment)
APIFY_TOKEN="PASTE_HERE"               # optional — Google Trends via the Apify actor
YOUTUBE_API_KEY="PASTE_HERE"           # optional — YouTube Data API v3 (sentiment comments)
BLS_API_KEY="PASTE_HERE"               # optional — BLS macro series
FEED_USER_AGENT="PASTE_HERE"           # optional — User-Agent for RSS/open feeds

# Per-collector budget/backfill knobs — ALL optional, every one has a sane
# default in code (see infra/oracle/env-inventory.md). Leave them PASTE_HERE
# unless you deliberately want to tune a collector.
SHAREHOLDING_BUDGET_MS="PASTE_HERE"
SENTIMENT_BUDGET_MS="PASTE_HERE"
CONCALL_BUDGET_MS="PASTE_HERE"
CREDIT_RATINGS_BUDGET_MS="PASTE_HERE"
IPOS_BUDGET_MS="PASTE_HERE"
TRENDS_MAX_SPEND_USD="PASTE_HERE"
# ========================== END SECRETS =====================================

REPO_URL="https://github.com/debmukdm-jioinstitute/MARKET-INTELLIGENCE"
MI_HOME="/opt/mi"

# --- system packages ---
echo "[mi-setup] installing system packages"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y git cron logrotate curl ca-certificates

# --- Node 22 via NodeSource (ARM64-capable) ---
if ! command -v node >/dev/null 2>&1 || ! node --version | grep -q "^v22"; then
  echo "[mi-setup] installing Node 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
fi
echo "[mi-setup] node $(node --version) / npm $(npm --version) / arch $(uname -m)"

# --- user + dirs ---
if ! id -u mi >/dev/null 2>&1; then
  echo "[mi-setup] creating user mi"
  useradd -m -s /bin/bash mi
fi
mkdir -p "$MI_HOME"/{repo,logs,bin}
chown -R mi:mi "$MI_HOME"

# --- write /opt/mi/.env from SECRETS (single-quoted, 600, mi:mi) ---
echo "[mi-setup] writing $MI_HOME/.env"
: > "$MI_HOME/.env"
write_env() {
  local key="$1" val="$2"
  if [ -z "$val" ] || [ "$val" = "PASTE_HERE" ]; then
    echo "[mi-setup] $key: not set (left empty — jobs degrade gracefully)"
    return 0
  fi
  # single-quote the value, escaping embedded single quotes
  local escaped
  escaped=$(printf '%s' "$val" | sed "s/'/'\\\\''/g")
  printf "%s='%s'\n" "$key" "$escaped" >> "$MI_HOME/.env"
  echo "[mi-setup] $key: set"
}
write_env DATABASE_URL              "$DATABASE_URL"
write_env TELEGRAM_BOT_TOKEN        "$TELEGRAM_BOT_TOKEN"
write_env TELEGRAM_CHAT_ID          "$TELEGRAM_CHAT_ID"
write_env RESEND_API_KEY            "$RESEND_API_KEY"
write_env RESEND_FROM_EMAIL         "$RESEND_FROM_EMAIL"
write_env NEXT_PUBLIC_SITE_URL      "$NEXT_PUBLIC_SITE_URL"
write_env VAPID_PUBLIC_KEY          "$VAPID_PUBLIC_KEY"
write_env VAPID_PRIVATE_KEY         "$VAPID_PRIVATE_KEY"
write_env UPSTOX_ACCESS_TOKEN       "$UPSTOX_ACCESS_TOKEN"
write_env HF_TOKEN                  "$HF_TOKEN"
write_env APIFY_TOKEN               "$APIFY_TOKEN"
write_env YOUTUBE_API_KEY           "$YOUTUBE_API_KEY"
write_env BLS_API_KEY               "$BLS_API_KEY"
write_env FEED_USER_AGENT           "$FEED_USER_AGENT"
write_env SHAREHOLDING_BUDGET_MS    "$SHAREHOLDING_BUDGET_MS"
write_env SENTIMENT_BUDGET_MS       "$SENTIMENT_BUDGET_MS"
write_env CONCALL_BUDGET_MS         "$CONCALL_BUDGET_MS"
write_env CREDIT_RATINGS_BUDGET_MS  "$CREDIT_RATINGS_BUDGET_MS"
write_env IPOS_BUDGET_MS            "$IPOS_BUDGET_MS"
write_env TRENDS_MAX_SPEND_USD      "$TRENDS_MAX_SPEND_USD"
chmod 600 "$MI_HOME/.env"
chown mi:mi "$MI_HOME/.env"

# --- clone repo (idempotent: pull if already present) ---
if [ -d "$MI_HOME/repo/.git" ]; then
  echo "[mi-setup] repo exists — pulling latest main"
  su mi -c "cd $MI_HOME/repo && git fetch origin && git reset --hard origin/main"
else
  echo "[mi-setup] cloning repo"
  su mi -c "git clone $REPO_URL $MI_HOME/repo"
fi

# --- install dependencies (full install; boot volume is 100 GB) ---
echo "[mi-setup] npm ci (this takes a few minutes)"
su mi -c "cd $MI_HOME/repo && npm ci --no-audit --no-fund"

# --- /opt/mi/bin/run.sh : the cron job wrapper ---
echo "[mi-setup] installing $MI_HOME/bin/run.sh"
cat > "$MI_HOME/bin/run.sh" <<'RUNEOF'
#!/bin/bash
# run.sh — cron job wrapper for Market Intelligence oracle runners.
# Sources /opt/mi/.env if present (auto-exported), cds to the repo, refuses to
# crash-loop when the target script file is missing, then execs the pinned tsx
# runner. All job output is appended to a per-job log by the cron line itself.
# Usage: run.sh scripts/oracle/<name>.ts [args...]
set -u
SCRIPT="${1:-}"
[ -f /opt/mi/.env ] && set -a && . /opt/mi/.env && set +a
cd /opt/mi/repo || { echo "[run.sh] $(date -u +%FT%TZ) cannot cd to /opt/mi/repo" >&2; exit 0; }
if [ -z "$SCRIPT" ] || [ ! -f "$SCRIPT" ]; then
  echo "[run.sh] $(date -u +%FT%TZ) target '$SCRIPT' missing — skipping (never crash-loop)" >&2
  exit 0
fi
exec npx --yes tsx@4.20.5 "$@"
RUNEOF
chmod 755 "$MI_HOME/bin/run.sh"

# --- /opt/mi/bin/heartbeat-wrapper.sh : 5-min liveness dead-man's-switch ---
echo "[mi-setup] installing $MI_HOME/bin/heartbeat-wrapper.sh"
cat > "$MI_HOME/bin/heartbeat-wrapper.sh" <<'HBEOF'
#!/bin/bash
# heartbeat-wrapper.sh — runs every 5 min via cron.
# 1) BASH appends an ISO-8601 UTC timestamp to /opt/mi/heartbeat.log FIRST —
#    this records even if Node/tsx/npm are completely broken.
# 2) Then run.sh executes scripts/oracle/heartbeat.ts, which INSERTs a row
#    into the oracle_heartbeat Postgres table — the "VM is alive" proof the
#    user checks in the Neon SQL editor (no SSH on this box).
#
# Honest note: this heartbeat is primarily OUR liveness signal. What keeps the
# instance safe from Oracle's idle-reclamation policy is the real job load
# (trade-lab slices every 15 min on weekdays, smart-notify every 30 min,
# collectors twice daily, ...).
set -u
date -u +%Y-%m-%dT%H:%M:%SZ >> /opt/mi/heartbeat.log
exec /opt/mi/bin/run.sh scripts/oracle/heartbeat.ts
HBEOF
chmod 755 "$MI_HOME/bin/heartbeat-wrapper.sh"
chown -R mi:mi "$MI_HOME/bin"

# --- cron schedule for user mi (ALL TIMES UTC) ---
# Verified against .github/workflows/*.yml (2026-10-07). Replicates them exactly.
#
# NOTE on trade-lab parallelism: 4 slices x 6 workers on 2 OCPUs will contend,
# but the slices are I/O-bound (candle fetches over the network) with a 50s
# wall-clock budget and resume-next-tick semantics — a contended tick just does
# less work and the next tick (15 min later) resumes. This matches the old
# GitHub Actions behaviour (4 sequential curls, same 90s budget) closely enough.
#
# NOTE on telegram-data-brief timing: the briefing used to be chained INSIDE
# scripts/collectors/run-collectors.ts as a best-effort POST after ingest
# finished. On the VM it gets its own cron lines at 01:05 / 13:05 UTC
# (06:35 / 18:35 IST) — 35 min after the 00:30 / 12:30 UTC collectors start,
# giving the collectors (35-min worst case) time to finish. The endpoint
# dedups per AM/PM IST slot, so exact timing isn't critical and double-runs
# can never double-send.
echo "[mi-setup] installing /etc/cron.d/mi"
cat > /etc/cron.d/mi <<'CRONEOF'
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
HOME=/home/mi

# --- trade-lab: 4 parallel slices, every 15 min 03:00-10:59 UTC Mon-Fri (was trade-lab.yml "*/15 3-10 * * 1-5") ---
*/15 3-10 * * 1-5 mi /opt/mi/bin/run.sh scripts/oracle/run-trade-lab.ts --tf=15m --limit=45 >>/opt/mi/logs/run-trade-lab-15m.log 2>&1
*/15 3-10 * * 1-5 mi /opt/mi/bin/run.sh scripts/oracle/run-trade-lab.ts --tf=1d --offset=0 --limit=100 >>/opt/mi/logs/run-trade-lab-1d-0.log 2>&1
*/15 3-10 * * 1-5 mi /opt/mi/bin/run.sh scripts/oracle/run-trade-lab.ts --tf=1d --offset=100 --limit=100 >>/opt/mi/logs/run-trade-lab-1d-100.log 2>&1
*/15 3-10 * * 1-5 mi /opt/mi/bin/run.sh scripts/oracle/run-trade-lab.ts --tf=1d --offset=200 --limit=100 >>/opt/mi/logs/run-trade-lab-1d-200.log 2>&1
# --- trade-lab: end-of-day pass 10:10 UTC (was trade-lab.yml "10 10 * * 1-5") ---
10 10 * * 1-5 mi /opt/mi/bin/run.sh scripts/oracle/run-trade-lab.ts --tf=15m --limit=45 >>/opt/mi/logs/run-trade-lab-15m.log 2>&1
10 10 * * 1-5 mi /opt/mi/bin/run.sh scripts/oracle/run-trade-lab.ts --tf=1d --offset=0 --limit=100 >>/opt/mi/logs/run-trade-lab-1d-0.log 2>&1
10 10 * * 1-5 mi /opt/mi/bin/run.sh scripts/oracle/run-trade-lab.ts --tf=1d --offset=100 --limit=100 >>/opt/mi/logs/run-trade-lab-1d-100.log 2>&1
10 10 * * 1-5 mi /opt/mi/bin/run.sh scripts/oracle/run-trade-lab.ts --tf=1d --offset=200 --limit=100 >>/opt/mi/logs/run-trade-lab-1d-200.log 2>&1
# --- smart-notify: every 30 min (was smart-notify.yml) ---
*/30 * * * * mi /opt/mi/bin/run.sh scripts/oracle/run-smart-notify.ts >>/opt/mi/logs/run-smart-notify.log 2>&1
# --- collect / warm-feed-hub / stress / alerts: every 3 h (was collect.yml) ---
0 */3 * * * mi /opt/mi/bin/run.sh scripts/oracle/run-collect.ts >>/opt/mi/logs/run-collect.log 2>&1
0 */3 * * * mi /opt/mi/bin/run.sh scripts/oracle/run-warm-feed-hub.ts >>/opt/mi/logs/run-warm-feed-hub.log 2>&1
0 */3 * * * mi /opt/mi/bin/run.sh scripts/oracle/run-stress.ts >>/opt/mi/logs/run-stress.log 2>&1
0 */3 * * * mi /opt/mi/bin/run.sh scripts/oracle/run-alerts.ts >>/opt/mi/logs/run-alerts.log 2>&1
# --- betas: daily 01:00 UTC (was betas.yml) ---
0 1 * * * mi /opt/mi/bin/run.sh scripts/oracle/run-betas.ts >>/opt/mi/logs/run-betas.log 2>&1
# --- brief: pre-market + post-close, weekdays (was brief.yml) ---
45 2 * * 1-5 mi /opt/mi/bin/run.sh scripts/oracle/run-brief.ts --kind=pre >>/opt/mi/logs/run-brief-pre.log 2>&1
30 10 * * 1-5 mi /opt/mi/bin/run.sh scripts/oracle/run-brief.ts --kind=post >>/opt/mi/logs/run-brief-post.log 2>&1
# --- competition snapshot: 10:20 UTC weekdays (was alpha-league.yml) ---
20 10 * * 1-5 mi /opt/mi/bin/run.sh scripts/oracle/run-competition-snapshot.ts >>/opt/mi/logs/run-competition-snapshot.log 2>&1
# --- collectors: 00:30 + 12:30 UTC daily (was collectors.yml) ---
30 0 * * * mi /opt/mi/bin/run.sh scripts/oracle/run-collectors.ts >>/opt/mi/logs/run-collectors.log 2>&1
30 12 * * * mi /opt/mi/bin/run.sh scripts/oracle/run-collectors.ts >>/opt/mi/logs/run-collectors.log 2>&1
# --- telegram data brief: 01:05 + 13:05 UTC (5 min after collectors' worst case; endpoint dedups per AM/PM IST slot) ---
5 1 * * * mi /opt/mi/bin/run.sh scripts/oracle/run-telegram-data-brief.ts >>/opt/mi/logs/run-telegram-data-brief.log 2>&1
5 13 * * * mi /opt/mi/bin/run.sh scripts/oracle/run-telegram-data-brief.ts >>/opt/mi/logs/run-telegram-data-brief.log 2>&1
# --- heartbeat: every 5 min (liveness dead-man's-switch; see heartbeat-wrapper.sh) ---
*/5 * * * * mi /opt/mi/bin/heartbeat-wrapper.sh >>/opt/mi/logs/heartbeat.log 2>&1
CRONEOF
chmod 644 /etc/cron.d/mi
chown mi:mi "$MI_HOME/logs"
systemctl enable --now cron 2>/dev/null || service cron start 2>/dev/null || true

# --- logrotate ---
echo "[mi-setup] installing logrotate config"
cat > /etc/logrotate.d/mi <<'LOGEOF'
/opt/mi/logs/*.log /opt/mi/heartbeat.log {
  weekly
  rotate 4
  compress
  missingok
  notifempty
  copytruncate
}
LOGEOF

echo "[mi-setup] DONE at $(date -u +%FT%TZ)"
JOB_LINES=$(grep -cE "^[0-9*]" /etc/cron.d/mi)
echo "[mi-setup] cron job lines installed: $JOB_LINES"
