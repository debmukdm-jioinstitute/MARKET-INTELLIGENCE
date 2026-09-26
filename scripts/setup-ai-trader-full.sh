#!/bin/bash
# One-shot: Python 3.13 venv, TimescaleDB (Docker), schema, full Flask on :5050.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SVC="${ROOT}/services/ai-trader"
export PATH="${HOME}/.local/bin:${PATH}"

UV="${UV:-uv}"
if ! command -v "$UV" >/dev/null 2>&1; then
  echo "Installing uv…" >&2
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="${HOME}/.local/bin:${PATH}"
fi

"$UV" python install 3.13
cd "$SVC"
if [[ ! -d .venv ]] || ! .venv/bin/python -c 'import sys; exit(0 if sys.version_info[:2]==(3,13) else 1)' 2>/dev/null; then
  rm -rf .venv
  "$UV" venv --python 3.13 .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
"$UV" pip install -r requirements.txt flask flask-cors gunicorn

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found. Install Docker Desktop, then re-run this script." >&2
  echo "  https://docs.docker.com/desktop/setup/install/mac-install/" >&2
  exit 1
fi

docker compose -f docker-compose.yml up -d
echo "Waiting for Postgres…"
for _ in $(seq 1 60); do
  if docker compose -f docker-compose.yml exec -T timescaledb pg_isready -U postgres -d trading >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if [[ ! -f .env ]]; then
  cat > .env <<'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trading
DB_USER=postgres
DB_PASSWORD=postgres
# Add TrueData for live ticks (optional for paper-only startup):
# TRUEDATA_USER=
# TRUEDATA_PASSWORD=
EOF
  echo "Created services/ai-trader/.env — add TRUEDATA_* for live market data."
fi

python -c "from database.db import init_db; init_db()"
echo "Full stack ready. Start with: ${ROOT}/scripts/start-ai-trader-backend.sh"
