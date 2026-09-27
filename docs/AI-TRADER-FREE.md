# AI-trader — free production path

## Option A — Demo desk on Vercel (recommended, no card)

| Piece | Free OSS stack |
|--------|------------------|
| Portal + algo API | Same Next.js app — [`demo-fixtures.ts`](../src/lib/ai-trader/demo-fixtures.ts) |
| Database | None |
| Fly / Tiger | Not required |

```bash
chmod +x scripts/enable-algo-demo-vercel.sh
./scripts/enable-algo-demo-vercel.sh
```

Sets `AI_TRADER_DEMO_MODE=true` on production and redeploys. Signed-in `/algo` gets sample backtests, equity curves, and `/api/days` without `DB_HOST=localhost` or Fly billing.

To use a remote Flask again later: set `AI_TRADER_DEMO_MODE=false` and a valid `AI_TRADER_API_URL`.

## Option A2 — Demo on Fly (optional)

If you prefer a separate Flask host and have Fly billing enabled:

```bash
chmod +x scripts/deploy-ai-trader-demo-fly.sh
./scripts/deploy-ai-trader-demo-fly.sh
```

Uses [`demo_desk.py`](../services/ai-trader/scripts/demo_desk.py) + `Dockerfile.demo`.

## Option B — Full desk on free Postgres (Neon)

Your Vercel project already uses **Neon** for `DATABASE_URL`. Reuse the same project (separate database name `trading` optional):

1. [Neon console](https://console.neon.tech) → project linked to Vercel → copy **pooled** `postgres://…` URL.
2. Map into ai-trader:

```bash
./scripts/ai-trader-db-from-url.sh 'postgres://USER:PASS@HOST/neondb?sslmode=require'
```

3. Init schema once (Timescale hypertables skip on Neon; plain tables still work):

```bash
cd services/ai-trader && python -c "from database.db import init_db; init_db()"
```

4. Deploy full Flask (needs TrueData + `models/saved/*.pkl` for real scans):

```bash
./scripts/deploy-ai-trader-fly.sh
```

**Do not** leave `DB_HOST=localhost` in `services/ai-trader/.env` for Fly — deploy script blocks that on purpose.

## Option C — Tiger trial (Timescale hypertables)

30-day Tiger Cloud trial (see [AI-TRADER-PRODUCTION.md](./AI-TRADER-PRODUCTION.md)) if you want hypertables identical to local Docker Timescale.

## Upgrade path

Demo Fly app → full Fly app: change `AI_TRADER_API_URL` from `https://mi-algo-demo.fly.dev` to your full app URL after `./scripts/deploy-ai-trader-fly.sh`.
