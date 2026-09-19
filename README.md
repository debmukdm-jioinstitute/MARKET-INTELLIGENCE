# Market Intelligence

The World's Best Data-Backed Virtual Portfolio Management & Investment Intelligence Platform.

Market Intelligence is an institutional-grade virtual desk for individual investors, analysts, and portfolio managers. It is designed to feel closer to a professional portfolio-management terminal than a retail stock tracker.

## Capabilities

- Portfolio management with live virtual tickets
- Investment research workbench
- Asset allocation (class, sector, geography)
- Risk management (vol, VaR, drawdown, TE, risk contribution)
- Performance attribution (Brinson-Fachler)
- Quantitative analysis (moments, Sharpe, Sortino, alpha/beta)
- Macroeconomic intelligence board
- Market data tape for the investable universe
- Scenario analysis (soft landing, recession, inflation, AI boom, USD surge)
- Mean-variance and risk-parity optimization
- Strategy backtesting with rebalance rules
- Investment-committee reporting (print/PDF)

Portfolio KPIs: Portfolio Value, Today's P&L, Total Return, CAGR, Alpha, Beta, Sharpe, Sortino, Maximum Drawdown, Volatility, Tracking Error, Information Ratio, Value at Risk, Cash %, Portfolio Turnover.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Market history is a **deterministic factor simulation** (2019–2026) so the platform is fully usable without market-data API keys. Prices are internally consistent across books, backtests, and scenarios.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · Recharts
