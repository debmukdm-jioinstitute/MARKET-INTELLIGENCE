#!/bin/bash
# Weekly Prowess sync (run by launchd: ~/Library/LaunchAgents/com.marketintelligence.prowess-sync.plist).
# CMIE only accepts the API key from this machine's IP, so the sync runs here and pushes to the site's ingest endpoint.
cd "$(dirname "$0")/.." || exit 1
export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
for k in PROWESS_API_KEY PROWESS_INGEST_SECRET PROWESS_INGEST_URL; do
  export "$k=$(grep "^$k=" .env.local | tail -1 | cut -d= -f2- | tr -d '\r\n"')"
done
echo "=== $(date) ==="
exec caffeinate -i npx --yes tsx scripts/prowess-sync.ts
