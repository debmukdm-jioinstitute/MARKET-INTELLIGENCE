#!/bin/bash
# After copying Tiger postgres URL in Chrome: run this (no paste in chat).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
URL=$(pbpaste | tr -d '\n\r')
if [[ "$URL" != postgres://* && "$URL" != postgresql://* ]]; then
  echo "Clipboard is not a postgres URL. In Tiger: Connect → copy URI → run again." >&2
  exit 1
fi
exec "${ROOT}/scripts/ai-trader-db-from-url.sh" "$URL"
