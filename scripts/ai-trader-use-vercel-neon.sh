#!/bin/bash
# Point ai-trader at the same free Neon Postgres as the Next.js app (no localhost).
# Usage:
#   ./scripts/ai-trader-use-vercel-neon.sh 'postgres://…'   # from Vercel → Storage → Neon → Connect
# Or paste pooled POSTGRES_URL from Vercel project settings.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
URL="${1:-${POSTGRES_URL:-${DATABASE_URL:-}}}"
if [[ -z "$URL" ]]; then
  echo "Pass Neon postgres URL (Vercel → Settings → Environment Variables → POSTGRES_URL)." >&2
  exit 1
fi
"${ROOT}/scripts/ai-trader-db-from-url.sh" "$URL"
echo "Next: cd services/ai-trader && python -c \"from database.db import init_db; init_db()\""
echo "Then: ./scripts/deploy-ai-trader-fly.sh  (or stay on demo: ./scripts/deploy-ai-trader-demo-fly.sh)"
