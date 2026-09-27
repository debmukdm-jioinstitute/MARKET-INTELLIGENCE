# OptionStrat AI integration

Market Intelligence embeds **theta-style option strategy recommendations** and **BSM P&L heatmaps** on [AI Signals](/intelligence/ai-signals), adapted from the open project [EconomiaUNMSM/OptionStrat-AI](https://github.com/EconomiaUNMSM/OptionStrat-AI).

## What we reuse

- Strategy construction (bull put / bear call / iron condor / short strangle) and ROC-style metrics
- Black–Scholes heatmap simulation

## What differs

- **India index options** via Upstox (NIFTY, BANK NIFTY, FINNIFTY) — not US tickers or IBKR
- Lot sizes and wing widths in **index points** (NIFTY 25 lot, 100pt wings, etc.)
- Bias can follow the page’s **ensemble lean** (Bullish / Bearish / Neutral)
- No Finviz / LLM insights from upstream (those stay in the upstream repo)

## Code map

| Upstream concept | This repo |
|------------------|-----------|
| `backend/app/core/black_scholes.py` | `src/lib/optionstrat/black-scholes.ts` |
| `backend/app/services/strategy_recommender.py` | `src/lib/optionstrat/strategy-recommender.ts` |
| `backend/app/services/strategy_builder.py` | `src/lib/optionstrat/heatmap.ts` |
| FastAPI routes | `src/app/api/optionstrat/*` |

## Requirements

- Signed-in user
- `UPSTOX_ACCESS_TOKEN` (or configured Upstox headers) for live chains with Greeks
