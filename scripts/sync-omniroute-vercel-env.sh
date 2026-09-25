#!/bin/bash
# After cloudflared quick tunnel starts, sync OMNROUTE_BASE_URL on Vercel if the hostname changed.
set -euo pipefail
LOG="${HOME}/.omniroute/cloudflared.log"
URL_FILE="${HOME}/.omniroute/tunnel-url.txt"
SYNCED_FILE="${HOME}/.omniroute/vercel-synced-tunnel.txt"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

HOST=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | tail -1)
if [[ -z "$HOST" ]]; then
  echo "No trycloudflare URL in $LOG" >&2
  exit 1
fi

echo "$HOST" > "$URL_FILE"

PREV=""
[[ -f "$SYNCED_FILE" ]] && PREV=$(cat "$SYNCED_FILE")
if [[ "$HOST" == "$PREV" ]]; then
  echo "Vercel already synced for tunnel: $HOST"
  exit 0
fi
echo "New tunnel: $HOST — updating Vercel OMNROUTE_BASE_URL…"
cd "$ROOT"
vercel env rm OMNROUTE_BASE_URL production -y >/dev/null 2>&1 || true
vercel env rm OMNROUTE_BASE_URL preview -y >/dev/null 2>&1 || true
printf '%s' "${HOST}/v1" | vercel env add OMNROUTE_BASE_URL production
printf '%s' "${HOST}/v1" | vercel env add OMNROUTE_BASE_URL preview
vercel --prod --yes
echo "$HOST" > "$SYNCED_FILE"
