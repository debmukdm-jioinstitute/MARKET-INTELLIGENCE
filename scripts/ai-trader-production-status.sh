#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV="${ROOT}/services/ai-trader/.env"
export PATH="${HOME}/.fly/bin:${PATH}"

ok() { echo "OK   $*"; }
bad() { echo "FAIL $*"; }

if [[ -f "$ENV" ]] && grep -q '^DB_HOST=' "$ENV"; then
  host=$(grep '^DB_HOST=' "$ENV" | cut -d= -f2-)
  if [[ "$host" == "localhost" || "$host" == "127.0.0.1" ]]; then
    bad "Tiger DB — still localhost (run ai-trader-db-from-url.sh)"
  else
    ok "Tiger DB_HOST=$host"
  fi
else
  bad "Missing services/ai-trader/.env"
fi

if fly auth whoami >/dev/null 2>&1; then
  ok "Fly logged in as $(fly auth whoami 2>/dev/null | tail -1)"
else
  bad "Fly — run: fly auth login"
fi

APP="${FLY_APP_NAME:-mi-ai-trader}"
if curl -sf -m 8 "https://${APP}.fly.dev/api/state" >/tmp/mi-ai-state.json 2>/dev/null; then
  ok "https://${APP}.fly.dev/api/state"
  grep -o '"db_connected":[^,}]*' /tmp/mi-ai-state.json || true
else
  bad "No Fly app at https://${APP}.fly.dev (deploy not done or wrong name)"
fi

pgrep -f "cloudflared tunnel.*127.0.0.1:5050" >/dev/null && bad "Mac algo tunnel :5050 still running" || ok "Mac algo tunnel :5050 off"
