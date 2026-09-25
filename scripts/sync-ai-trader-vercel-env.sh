#!/bin/bash
# After cloudflared quick tunnel starts, sync AI_TRADER_API_URL on Vercel if the hostname changed.
set -euo pipefail
LOG="${HOME}/.ai-trader/cloudflared-5050.log"
URL_FILE="${HOME}/.ai-trader/tunnel-url.txt"
SYNCED_FILE="${HOME}/.ai-trader/vercel-synced-tunnel.txt"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

HOST=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | tail -1)
if [[ -z "$HOST" ]]; then
  echo "No trycloudflare URL in $LOG — start Flask on :5050, then: ./scripts/ai-trader-tunnel.sh" >&2
  exit 1
fi

echo "$HOST" > "$URL_FILE"

PREV=""
[[ -f "$SYNCED_FILE" ]] && PREV=$(cat "$SYNCED_FILE")
if [[ "$HOST" == "$PREV" ]]; then
  echo "Vercel already synced for tunnel: $HOST"
  exit 0
fi
echo "New tunnel: $HOST — updating Vercel AI_TRADER_API_URL…"
cd "$ROOT"
vercel env rm AI_TRADER_API_URL production -y >/dev/null 2>&1 || true
vercel env rm AI_TRADER_API_URL preview -y >/dev/null 2>&1 || true
printf '%s' "$HOST" | vercel env add AI_TRADER_API_URL production
printf '%s' "$HOST" | vercel env add AI_TRADER_API_URL preview
vercel --prod --yes
echo "$HOST" > "$SYNCED_FILE"
