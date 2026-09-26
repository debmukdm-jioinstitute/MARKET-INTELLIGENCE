#!/bin/bash
# Map Tiger Cloud / Postgres URL → services/ai-trader/.env DB_* lines (keeps other keys).
# Usage: ./scripts/ai-trader-db-from-url.sh 'postgres://user:pass@host:5432/db?sslmode=require'
set -euo pipefail
URL="${1:?postgres URL required}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/services/ai-trader/.env"

python3 - "$URL" "$ENV_FILE" <<'PY'
import sys, urllib.parse
from pathlib import Path

url = sys.argv[1]
env_path = Path(sys.argv[2])

parsed = urllib.parse.urlparse(url)
if parsed.scheme not in ("postgres", "postgresql"):
    raise SystemExit(f"Expected postgres URL, got {parsed.scheme}")

user = urllib.parse.unquote(parsed.username or "")
password = urllib.parse.unquote(parsed.password or "")
host = parsed.hostname or "localhost"
port = parsed.port or 5432
dbname = (parsed.path or "/trading").lstrip("/") or "trading"
qs = urllib.parse.parse_qs(parsed.query)
sslmode = (qs.get("sslmode") or ["require"])[0]

lines: list[str] = []
existing: dict[str, str] = {}
if env_path.exists():
    for line in env_path.read_text().splitlines():
        s = line.strip()
        if s and not s.startswith("#") and "=" in s:
            k, _, v = line.partition("=")
            existing[k.strip()] = v

existing["DB_HOST"] = host
existing["DB_PORT"] = str(port)
existing["DB_NAME"] = dbname
existing["DB_USER"] = user
existing["DB_PASSWORD"] = password
existing["DB_SSLMODE"] = sslmode

priority = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD", "DB_SSLMODE"]
seen = set()
for k in priority:
    if k in existing:
        lines.append(f"{k}={existing[k]}")
        seen.add(k)
for k in sorted(existing):
    if k not in seen:
        lines.append(f"{k}={existing[k]}")

env_path.parent.mkdir(parents=True, exist_ok=True)
env_path.write_text("\n".join(lines) + "\n")
print(f"Wrote {env_path}")
PY
