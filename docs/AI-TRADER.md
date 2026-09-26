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

1. **Python stack** (from `services/ai-trader/` in this repo — vendored copy of upstream):

   ```bash
   cd services/ai-trader
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
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

## Production (Vercel + VPS)

1. Deploy Flask + PostgreSQL/TimescaleDB on a VPS, Railway, or [Diploi](https://diploi.com/launch/aaryansinha16/AI-trader) using upstream `diploi.yaml`.
2. Set Vercel env **`AI_TRADER_API_URL`** to the public HTTPS origin of Flask (no trailing slash).
3. Ensure Flask CORS allows your portal origin if you ever call it directly; the portal proxy avoids browser CORS for same-origin `/api/ai-trader`.

## Disclaimer

Algo desk features are for **research and education**. Live broker mode can place real orders. Not investment advice; SEBI algo rules apply to live automation in India.
