#!/bin/bash
# Start AI-trader Flask on :5050 — full backend if Python 3.13 venv works, else health stub.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SVC="${ROOT}/services/ai-trader"
LOG="${HOME}/.ai-trader/flask.log"
mkdir -p "${HOME}/.ai-trader"

cd "$SVC"
if [[ -x .venv/bin/python ]]; then
  PY=.venv/bin/python
else
  echo "Creating venv…" >&2
  python3 -m venv .venv
  PY=.venv/bin/python
  "$PY" -m pip install -q flask flask-cors python-dotenv || true
fi

if "$PY" -c "import pandas_ta" 2>/dev/null; then
  echo "Starting full AI-trader backend (backend/app.py)…" | tee -a "$LOG"
  exec "$PY" backend/app.py >>"$LOG" 2>&1
else
  echo "Starting health stub (install Python 3.13 + requirements.txt for full stack)…" | tee -a "$LOG"
  exec "$PY" scripts/health_stub.py >>"$LOG" 2>&1
fi
