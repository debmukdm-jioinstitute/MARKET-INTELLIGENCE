#!/bin/bash
# Keep AI-trader reachable from Vercel: Flask :5050 + Cloudflare tunnel + env sync.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.local/bin:${PATH}"
mkdir -p "${HOME}/.ai-trader"

if ! lsof -iTCP:5050 -sTCP:LISTEN >/dev/null 2>&1; then
  nohup "${ROOT}/scripts/start-ai-trader-backend.sh" >>"${HOME}/.ai-trader/flask-runner.log" 2>&1 &
  echo "Started Flask (log: ~/.ai-trader/flask.log)"
  for _ in $(seq 1 30); do
    curl -sf http://127.0.0.1:5050/api/state >/dev/null && break
    sleep 1
  done
fi

if ! pgrep -f "cloudflared tunnel.*127.0.0.1:5050" >/dev/null 2>&1; then
  nohup "${ROOT}/scripts/ai-trader-tunnel.sh" >>"${HOME}/.ai-trader/tunnel-runner.log" 2>&1 &
  echo "Started cloudflared tunnel (log: ~/.ai-trader/cloudflared-5050.log)"
fi

LOG="${HOME}/.ai-trader/cloudflared-5050.log"
HOST=""
for _ in $(seq 1 45); do
  HOST=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" 2>/dev/null | tail -1)
  [[ -n "$HOST" ]] && curl -sf "${HOST}/api/state" >/dev/null 2>&1 && break
  sleep 2
done

if [[ -n "$HOST" ]]; then
  "${ROOT}/scripts/sync-ai-trader-vercel-env.sh" || true
  echo "$HOST"
else
  echo "Tunnel URL not ready — check ~/.ai-trader/cloudflared-5050.log" >&2
  exit 1
fi
