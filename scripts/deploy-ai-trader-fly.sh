#!/bin/bash
# Deploy AI-trader to Fly.io (BOM) and point Vercel AI_TRADER_API_URL at it.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SVC="${ROOT}/services/ai-trader"
ENV_FILE="${SVC}/.env"
export PATH="${HOME}/.fly/bin:${HOME}/.local/bin:${PATH}"

if ! command -v flyctl >/dev/null 2>&1 && ! command -v fly >/dev/null 2>&1; then
  echo "Install flyctl: https://fly.io/docs/hands-on/install-flyctl/" >&2
  exit 1
fi
FLY="${FLY:-flyctl}"
command -v "$FLY" >/dev/null 2>&1 || FLY=fly

cd "$SVC"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing ${ENV_FILE}. Copy .env.example, add Tiger URL via ./scripts/ai-trader-db-from-url.sh" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

for v in DB_HOST DB_USER DB_PASSWORD DB_NAME; do
  if [[ -z "${!v:-}" ]]; then
    echo "Set ${v} in ${ENV_FILE} (Tiger Cloud → Connection string → ai-trader-db-from-url.sh)" >&2
    exit 1
  fi
done
if [[ "$DB_HOST" == "localhost" || "$DB_HOST" == "127.0.0.1" ]]; then
  echo "DB_HOST is still localhost. Run ./scripts/ai-trader-db-from-url.sh with Tiger postgres URL first." >&2
  exit 1
fi
if [[ "${TRUEDATA_USER:-}" == "your_truedata_username" || -z "${TRUEDATA_USER:-}" ]]; then
  echo "Set TRUEDATA_USER / TRUEDATA_PASSWORD in ${ENV_FILE} (optional for deploy, needed for live ticks)." >&2
fi

if ! "$FLY" auth whoami >/dev/null 2>&1; then
  echo "Fly not logged in. In Terminal run: export PATH=\"\$HOME/.fly/bin:\$PATH\" && fly auth login" >&2
  exit 1
fi
"$FLY" launch --no-deploy --copy-config --yes 2>/dev/null || "$FLY" apps list >/dev/null

"$FLY" secrets set \
  DB_HOST="$DB_HOST" \
  DB_PORT="${DB_PORT:-5432}" \
  DB_NAME="$DB_NAME" \
  DB_USER="$DB_USER" \
  DB_PASSWORD="$DB_PASSWORD" \
  DB_SSLMODE="${DB_SSLMODE:-require}" \
  TRUEDATA_USER="${TRUEDATA_USER:-}" \
  TRUEDATA_PASSWORD="${TRUEDATA_PASSWORD:-}" \
  TRADE_MODE="${TRADE_MODE:-paper}" \
  --stage

"$FLY" deploy --ha=false

APP_HOST=$("$FLY" status --json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print('https://'+d.get('Hostname',''))" 2>/dev/null || true)
if [[ -z "$APP_HOST" || "$APP_HOST" == "https://" ]]; then
  APP_HOST="https://mi-ai-trader.fly.dev"
fi
APP_HOST="${APP_HOST%/}"

echo "Flask URL: ${APP_HOST}"
cd "$ROOT"
vercel env rm AI_TRADER_API_URL production -y >/dev/null 2>&1 || true
printf '%s' "$APP_HOST" | vercel env add AI_TRADER_API_URL production
vercel --prod --yes
echo "Vercel AI_TRADER_API_URL → ${APP_HOST}"
