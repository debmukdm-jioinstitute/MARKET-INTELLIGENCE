#!/bin/bash
# After Tiger login: paste postgres URL, optional TrueData, deploy Fly, point Vercel.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.fly/bin:${HOME}/.local/bin:${PATH}"

if [[ "${1:-}" == "" ]]; then
  echo "Usage: $0 'postgres://USER:PASS@HOST:5432/trading?sslmode=require'" >&2
  echo "Get URL from Tiger Cloud → Service → Connect." >&2
  exit 1
fi

"${ROOT}/scripts/ai-trader-db-from-url.sh" "$1"

ENV="${ROOT}/services/ai-trader/.env"
if grep -q 'your_truedata_username' "$ENV" 2>/dev/null; then
  echo "Edit ${ENV} — set TRUEDATA_USER and TRUEDATA_PASSWORD, then re-run:" >&2
  echo "  ${ROOT}/scripts/deploy-ai-trader-fly.sh" >&2
  exit 0
fi

if ! fly auth whoami >/dev/null 2>&1; then
  echo "Run in your Terminal (interactive):" >&2
  echo "  export PATH=\"\$HOME/.fly/bin:\$PATH\" && fly auth login" >&2
  exit 1
fi

"${ROOT}/scripts/deploy-ai-trader-fly.sh"

# Stop laptop tunnel path
pkill -f "cloudflared tunnel.*127.0.0.1:5050" 2>/dev/null || true
pkill -f "keep-ai-trader-alive" 2>/dev/null || true
echo "Stopped Mac cloudflared :5050 + keepalive (OmniRoute :20128 untouched if running)."

HOST="${FLY_APP_HOST:-https://mi-ai-trader.fly.dev}"
curl -sf "${HOST}/api/state" | head -c 400 || echo "Check ${HOST}/api/state after deploy settles."
