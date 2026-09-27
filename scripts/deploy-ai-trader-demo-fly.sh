#!/bin/bash
# Deploy open-source demo Flask (no DB) to Fly.io and point Vercel AI_TRADER_API_URL at it.
# Free path: Fly shared-cpu-1x + static fixture backtests. Upgrade later with deploy-ai-trader-fly.sh + Postgres.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SVC="${ROOT}/services/ai-trader"
export PATH="${HOME}/.fly/bin:${HOME}/.local/bin:${PATH}"

FLY="${FLY:-flyctl}"
command -v "$FLY" >/dev/null 2>&1 || FLY=fly

if ! "$FLY" auth whoami >/dev/null 2>&1; then
  echo "Run: export PATH=\"\$HOME/.fly/bin:\$PATH\" && fly auth login" >&2
  exit 1
fi

cd "$SVC"
"$FLY" launch --config fly.demo.toml --no-deploy --copy-config --yes 2>/dev/null || "$FLY" apps list >/dev/null
"$FLY" deploy --config fly.demo.toml --ha=false

APP_HOST=$("$FLY" status --config fly.demo.toml --json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print('https://'+d.get('Hostname',''))" 2>/dev/null || true)
if [[ -z "$APP_HOST" || "$APP_HOST" == "https://" ]]; then
  APP_HOST="https://mi-algo-demo.fly.dev"
fi
APP_HOST="${APP_HOST%/}"

echo "Demo Flask: ${APP_HOST}"
curl -sf "${APP_HOST}/api/state" | head -c 200 || echo "(wait ~30s for health check)"

cd "$ROOT"
vercel env rm AI_TRADER_API_URL production -y >/dev/null 2>&1 || true
printf '%s' "$APP_HOST" | vercel env add AI_TRADER_API_URL production
vercel --prod --yes
echo "Vercel AI_TRADER_API_URL → ${APP_HOST} (demo desk)"
