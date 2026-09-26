#!/bin/bash
# Restart Flask + tunnel if they exit (Mac must stay awake for production tunnel).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
while true; do
  if ! lsof -iTCP:5050 -sTCP:LISTEN >/dev/null 2>&1; then
    nohup "${ROOT}/scripts/start-ai-trader-backend.sh" >>"${HOME}/.ai-trader/flask-runner.log" 2>&1 &
    sleep 5
  fi
  if ! pgrep -f "cloudflared tunnel.*127.0.0.1:5050" >/dev/null 2>&1; then
    nohup "${ROOT}/scripts/ai-trader-tunnel.sh" >>"${HOME}/.ai-trader/tunnel-runner.log" 2>&1 &
    sleep 8
  fi
  sleep 30
done
