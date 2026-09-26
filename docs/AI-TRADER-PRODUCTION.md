# AI-trader production (Tiger Cloud + Fly/VPS)

Goal: **Vercel portal** talks to **always-on Flask** — not your Mac or Cloudflare quick tunnel.

```
getmarketintelligence.in  →  Vercel  →  AI_TRADER_API_URL  →  Fly/VPS :5050  →  Tiger Cloud (TimescaleDB)
```

## 1. Tiger Cloud (database)

1. Sign up: [Tiger Cloud](https://www.tigerdata.com/) (TimescaleDB, 30-day trial, no card for new accounts).
2. Create a **service** in a region close to India if offered (e.g. AWS `ap-south-1`), enable **TimescaleDB**.
3. Create database **`trading`** (or use default and set `DB_NAME` accordingly).
4. Copy the **PostgreSQL connection string** (`postgres://…` or `postgresql://…`, usually `sslmode=require`).

From repo root:

```bash
chmod +x scripts/ai-trader-db-from-url.sh
./scripts/ai-trader-db-from-url.sh 'postgres://USER:PASS@HOST:5432/trading?sslmode=require'
```

Add TrueData (live ticks) to `services/ai-trader/.env`:

```bash
TRUEDATA_USER=…
TRUEDATA_PASSWORD=…
```

Schema runs on deploy (`fly.toml` `release_command`) or once locally:

```bash
cd services/ai-trader && source .venv/bin/activate
export $(grep -v '^#' .env | xargs)
python -c "from database.db import init_db; init_db()"
```

## 2. Fly.io (recommended API host)

- Region: **`bom`** (Mumbai) in `services/ai-trader/fly.toml`
- ~2 GB RAM for pandas/torch/XGBoost

```bash
brew install flyctl   # or curl install from fly.io docs
fly auth login
chmod +x scripts/deploy-ai-trader-fly.sh
./scripts/deploy-ai-trader-fly.sh
```

Script: sets Fly **secrets** from `.env`, **`fly deploy`**, updates **Vercel `AI_TRADER_API_URL`**, **`vercel --prod`**.

Manual check:

```bash
curl -s "https://mi-ai-trader.fly.dev/api/state" | head
```

Expect `"db_connected": true` after Tiger is reachable and schema initialized.

## 3. Own VPS (Docker)

On Ubuntu VPS with Docker:

```bash
cd services/ai-trader
cp .env.example .env   # then Tiger URL script or edit DB_*
docker compose -f docker-compose.prod.yml up -d --build
```

Put **HTTPS** in front (Caddy/nginx) on `5050`, then set Vercel:

```bash
cd /path/to/market-intelligence
printf '%s' 'https://api.yourdomain.com' | vercel env add AI_TRADER_API_URL production
vercel --prod --yes
```

## 4. Turn off Mac tunnel

When Fly/VPS works:

- Stop local `cloudflared` and `keep-ai-trader-alive.sh`
- Confirm [https://getmarketintelligence.in/algo/live](https://getmarketintelligence.in/algo/live) (signed in) — banner should not say stub/offline

## Env reference

| Variable | Source |
|----------|--------|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Tiger connection string |
| `DB_SSLMODE` | Usually `require` (Tiger) |
| `TRUEDATA_USER`, `TRUEDATA_PASSWORD` | TrueData account |
| `TRADE_MODE` | `paper` (default) |
| Vercel `AI_TRADER_API_URL` | `https://<fly-app>.fly.dev` or VPS HTTPS origin, **no trailing slash** |

## Diploi

Upstream [diploi.yaml](../services/ai-trader/diploi.yaml) uses generic Postgres — **not** Timescale hypertables. Prefer **Tiger Cloud + Fly** in this repo for parity with local `schema.sql`.
