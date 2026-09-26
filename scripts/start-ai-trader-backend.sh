#!/bin/bash
# Start AI-trader Flask on :5050 — full backend if Python 3.13 venv works, else health stub.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SVC="${ROOT}/services/ai-trader"
LOG="${HOME}/.ai-trader/flask.log"
mkdir -p "${HOME}/.ai-trader" "${HOME}/.cache/numba"
export NUMBA_CACHE_DIR="${NUMBA_CACHE_DIR:-${HOME}/.cache/numba}"

cd "$SVC"
export PATH="${HOME}/.local/bin:${PATH}"
if [[ -x .venv/bin/python ]] && .venv/bin/python -c 'import sys; exit(0 if sys.version_info[:2]==(3,13) else 1)' 2>/dev/null; then
  PY=.venv/bin/python
elif command -v uv >/dev/null 2>&1; then
  echo "Creating Python 3.13 venv (uv)…" >&2
  uv python install 3.13 >/dev/null 2>&1 || true
  rm -rf .venv
  uv venv --python 3.13 .venv
  PY=.venv/bin/python
  uv pip install -q -r requirements.txt flask flask-cors gunicorn || true
else
  echo "Creating venv…" >&2
  python3 -m venv .venv
  PY=.venv/bin/python
  "$PY" -m pip install -q flask flask-cors python-dotenv || true
fi

if NUMBA_CACHE_DIR="$NUMBA_CACHE_DIR" "$PY" -c "import pandas_ta" 2>/dev/null; then
  echo "Starting full AI-trader backend (backend/app.py)…" | tee -a "$LOG"
  cd "$SVC"
  exec env NUMBA_CACHE_DIR="$NUMBA_CACHE_DIR" "$PY" backend/app.py >>"$LOG" 2>&1
else
  echo "Starting health stub (install Python 3.13 + requirements.txt for full stack)…" | tee -a "$LOG"
  exec "$PY" scripts/health_stub.py >>"$LOG" 2>&1
fi
