#!/bin/bash
# Expose local AI-trader Flask (127.0.0.1:5050) via Cloudflare quick tunnel.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CF="${ROOT}/.tools/cloudflared"
LOG="${HOME}/.ai-trader/cloudflared-5050.log"
mkdir -p "${HOME}/.ai-trader"

if [[ ! -x "$CF" ]]; then
  echo "Missing $CF" >&2
  exit 1
fi

echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) starting cloudflared → :5050 ===" >>"$LOG"
exec "$CF" tunnel --protocol http2 --url http://127.0.0.1:5050 >>"$LOG" 2>&1
