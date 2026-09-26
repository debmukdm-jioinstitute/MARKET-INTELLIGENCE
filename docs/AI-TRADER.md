# AI-trader integration (NIFTY F&O algo desk)

Market Intelligence embeds the [AI-trader](https://github.com/aaryansinha16/AI-trader) research platform under **`/algo`**. The Next.js portal proxies authenticated requests to the Python Flask backend; it does not run TimescaleDB or TrueData inside Vercel.

## Portal routes (UI)

| Path | Feature |
|------|---------|
| `/algo` | Dashboard — equity curve, risk profiles, live status |
| `/algo/live` | Live scanner, suggestions, auto/manual paper trades, SSE stream, broker status |
| `/algo/trades` | Trade history, P&L, strategy breakdown, journey charts |
| `/algo/backtest` | Tick replay backtest runner + results |
| `/algo/charts` | NIFTY candles, option chain, premium tick charts |
| `/algo/ai` | Macro/micro/strategy models + RL exit agent status |
| `/algo/settings` | LOW / MEDIUM / HIGH risk profiles + Zerodha connect |
| `/algo/replay` | Historical day tick replay simulation |

## Feature parity (upstream → portal)

| Upstream (AI-trader) | In Market Intelligence |
|----------------------|-------------------------|
| Dashboard | `/algo` |
| Live + SSE + auto/manual + broker panel | `/algo/live` |
| Trade history + journey charts | `/algo/trades` |
| Tick replay backtest UI | `/algo/backtest` |
| Replay simulation page | `/algo/replay` |
| Charts + option chain | `/algo/charts` |
| AI models status | `/algo/ai` |
| Risk profiles + CLI reference | `/algo/settings` |
| Vendored Python stack + scripts | `services/ai-trader/` |
| Flask API (all routes) | Proxied at `/api/ai-trader/api/*` |

## Backend capabilities (Flask, port 5050)

All routes are available through **`/api/ai-trader/...`** when signed in (e.g. `/api/ai-trader/api/state` → Flask `/api/state`).

- **Data:** TrueData WebSocket + REST → TimescaleDB (ticks, minute candles, option chain)
- **Features:** 80 macro + 5 micro indicators per bar
- **ML:** XGBoost macro/micro/strategy models, Q-learning RL exit agent
- **Strategies:** VWAP momentum breakout, bearish momentum, mean reversion
- **Risk:** Score-tiered lots, dynamic SL/target, trailing stops, regime gating
- **Execution:** Paper TEST/LIVE modes, optional Zerodha broker API (connect, kill switch, reconcile)
- **System:** Scanner start/stop, auto-trade toggle, SSE `/api/stream`

See upstream README for training scripts (`incremental_train.py`, `train_rl_on_journeys.py`, `tick_replay_backtest.py`).

## Run locally (recommended)

**Mac note:** System Python 3.14 breaks `pandas-ta` / `numba`. Use **Python 3.13** via [uv](https://docs.astral.sh/uv/):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
./scripts/setup-ai-trader-full.sh   # needs Docker Desktop for TimescaleDB
./scripts/run-ai-trader-live.sh     # Flask :5050 + tunnel + Vercel sync
```

Without Docker, Flask still starts (`db_connected: false`) but ticks/scanner need Postgres + TrueData in `services/ai-trader/.env`.

1. **Python stack** (from `services/ai-trader/` in this repo — vendored copy of upstream):

   ```bash
   cd services/ai-trader
   uv python install 3.13 && uv venv --python 3.13 .venv && source .venv/bin/activate
   export NUMBA_CACHE_DIR="$HOME/.cache/numba"
   uv pip install -r requirements.txt flask flask-cors psycopg[binary]
   cp .env.example .env   # DB + TRUEDATA_* credentials
   createdb trading && psql -d trading -c "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"
   uv run python -c "from database.db import init_db; init_db()"
   python backend/app.py
   ```

2. **Market Intelligence** (separate terminal):

   ```bash
   export AI_TRADER_API_URL=http://127.0.0.1:5050
   npm run dev
   ```

3. Open [http://localhost:3000/algo/live](http://localhost:3000/algo/live) after signing in.

## Production (no laptop)

**Tiger Cloud + Fly.io:** step-by-step in **[AI-TRADER-PRODUCTION.md](./AI-TRADER-PRODUCTION.md)** (`scripts/deploy-ai-trader-fly.sh`, `Dockerfile`, `fly.toml`).

Short: Tiger connection string → `./scripts/ai-trader-db-from-url.sh` → `./scripts/deploy-ai-trader-fly.sh` → Vercel `AI_TRADER_API_URL` points at `https://….fly.dev`.

## Disclaimer

Algo desk features are for **research and education**. Live broker mode can place real orders. Not investment advice; SEBI algo rules apply to live automation in India.
