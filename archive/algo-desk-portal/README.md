# NIFTY Algo Desk (archived)

Removed from the production Next.js app on getmarketintelligence.in.

- **Redirects:** `/algo` and `/algo/*` → `/intelligence/scanner` (301).
- **Removed routes:** `src/app/(portal)/algo/*` (dashboard, live, trades, backtest, replay, charts, settings).
- **Removed UI:** `src/components/ai-trader/*`, `src/lib/ai-trader/*`, `src/lib/algo-backtest/*`, proxy `src/app/api/ai-trader/*`.
- **MCP:** `get_algo_desk_snapshot` removed from account tools.
- **Still in repo:** Python backend `services/ai-trader/` for self-hosting — see [docs/AI-TRADER.md](../../docs/AI-TRADER.md).
- **Earlier removal:** `/algo/ai` UI snapshot in [../algo-ai-portal/](../algo-ai-portal/).

Recover full portal source from git history before the removal commit.
