#!/bin/bash
# Turn on built-in demo algo desk (no Fly, no Postgres). Free + instant on Vercel.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
vercel env rm AI_TRADER_DEMO_MODE production -y >/dev/null 2>&1 || true
printf 'true' | vercel env add AI_TRADER_DEMO_MODE production
echo "AI_TRADER_DEMO_MODE=true on production. Optional: remove AI_TRADER_API_URL if it pointed at a dead tunnel."
vercel --prod --yes
echo "Done — signed-in /algo uses fixture backtests from the Next.js proxy."
