# Market Intelligence

**Production:** [https://getmarketintelligence.vercel.app](https://getmarketintelligence.vercel.app)

Institutional-style virtual portfolio desk and investment intelligence for India and US markets. Live open-data feeds, research workbenches, macro regime analytics, and a full quantitative metrics catalog aligned to an internal specification.

---

## Table of contents

1. [Product overview](#1-product-overview)
2. [Portal map (nested)](#2-portal-map-nested)
3. [Data & integrations](#3-data--integrations)
4. [Portfolio metrics specification](#4-portfolio-metrics-specification)
5. [API surface (selected)](#5-api-surface-selected)
6. [Run locally](#6-run-locally)
7. [Environment variables](#7-environment-variables)
8. [Tech stack](#8-tech-stack)

---

## 1. Product overview

| Layer | What it does |
|--------|----------------|
| **Landing & auth** | Marketing site, guest explore, sign-up / login |
| **Live tape** | Scrolling **Live stream** ticker (India indices, global benchmarks, FX, commodities, vol) on every portal page |
| **India desk** | Dashboard pulse, FII/DII, breadth, F&O snapshot, macro rows |
| **Research** | Symbol search (NSE + US), per-symbol intelligence |
| **Macro hub** | Regime-first India macro with nested section pages |
| **Portfolio** | Real holdings (DB-backed), benchmark-relative analytics |
| **Quant desk** | Allocation, risk, attribution, scenarios, optimizer, backtest, reports |
| **Feeds** | Source health, RSS/API aggregation transparency |

---

## 2. Portal map (nested)

### 2.1 Public

- **[Home](https://getmarketintelligence.vercel.app/)** — Product positioning, feature highlights, auth entry
- **[/login](https://getmarketintelligence.vercel.app/login)** · **[/signup](https://getmarketintelligence.vercel.app/signup)** — Account access (guest mode available in portal)

### 2.2 Portal shell (authenticated / guest)

- **Sidebar navigation** — All modules below
- **Top bar** — Portfolio selector, **symbol search** (⌘K command palette), US tape snippets
- **Live stream ticker** — Auto-scrolling quotes; hover to pause; ℹ️ per symbol (novice copy + source)

---

### 2.3 India dashboard

**[/dashboard](https://getmarketintelligence.vercel.app/dashboard)**

- **Market pulse** — NIFTY 50, SENSEX, Bank Nifty, India VIX, USD/INR, 10Y G-Sec, Brent, Gold (+ NSE breadth)
- **India moving** — Index snapshots, 1M history, India VIX, NIFTY/BANKNIFTY F&O (PCR, OI, max pain when available)
- **Global radar** — S&P, Nasdaq, Dow, US 10Y, DXY, VIX, Brent, USD/INR, copper
- **India macro strip** — CPI, WPI, GDP proxy, credit, deposits, FX reserves (World Bank / MOSPI / RBI paths)
- **RBI liquidity** — Policy / G-Sec links; system liquidity placeholders toward RBI NSD
- **Money flow** — FII vs DII (NSE), category labels

---

### 2.4 Command center

**[/app](https://getmarketintelligence.vercel.app/app)**

- Cross-portfolio jump links (virtual books + KPI highlights)
- Quick navigation to stress, optimizer, macro, research

---

### 2.5 Portfolio (your book)

**[/portfolio](https://getmarketintelligence.vercel.app/portfolio)**

- **Holdings** — Add India (Upstox instrument key) or US symbols; live marks in INR
- **Performance chart** — Portfolio vs chosen benchmark (NIFTY 50 / S&P 500 / NASDAQ 100), rebased
- **Overview KPIs** — NAV, return, alpha, Sharpe, drawdown, TE, IR, concentration, etc.
- **Risk | exposure** — Category rollup from full metrics catalog
- **Attribution** — Top stock contributors (weight × return)
- **Full metrics catalog** — Expandable sections; every metric has **ℹ️** with definition, formula, and spec section

**Benchmarks:** `NIFTY50` · `SPX` · `NDX`

**Algorithms:** See [Portfolio metrics specification](#4-portfolio-metrics-specification).

---

### 2.6 Research

**[/research](https://getmarketintelligence.vercel.app/research)**

- Hero / bar **symbol search** — India NSE universe + curated US list (+ NSE instrument master)
- **[/research/[symbol]](https://getmarketintelligence.vercel.app/research/RELIANCE)** — Per-symbol desk:
  - **India (Upstox)** — Live quote, depth ladder, 1Y candles, key ratios
  - **US** — Massive / Yahoo quote, history, SEC filings link
  - **Intelligence panels**
    - Corporate actions (NSE calendar / SEC filings)
    - **News & impact** — Upstox + Google News RSS; rule-based positive/neutral/negative tags
    - **Brokerage & research** — Free portals (Screener, Moneycontrol, Yahoo, Google search); analyst headline RSS
  - **Data sources** — Provenance list per field

---

### 2.7 Macro (India hub)

**[/macro](https://getmarketintelligence.vercel.app/macro)**

- **What changed since you last visit?** — Five clickable briefing items (localStorage diff): FII, G-Sec, IT vs NIFTY, portfolio, crude/FX
- **Yield curve** — India G-Sec ladder + mini chart; US 2Y / 10Y
- **Commodities strip** — Brent, gold, silver, copper → detail pages
- **Currency strip** — USD/INR & DXY emphasized; EUR/GBP/JPY crosses
- **Commodity → India transmission** — Sector map (e.g. Brent → ONGC / OMCs / airlines / paints)
- **FX → India transmission** — USD/INR → IT/pharma vs import-heavy names
- **Macro regime banner** — Growth, inflation, liquidity, rates, fiscal, external (🟢/🟠/🔴)
- **Growth vs inflation chart** — Regime driver history
- **Section grid** — Deep dives below

#### 2.7.1 Macro nested sections

| Path | Focus |
|------|--------|
| [/macro/regime](https://getmarketintelligence.vercel.app/macro/regime) | Quadrant history (Goldilocks / Reflation / Stagflation / Deflation) |
| [/macro/growth](https://getmarketintelligence.vercel.app/macro/growth) | GDP/GVA (WB), expenditure split, HF indicator links |
| [/macro/inflation](https://getmarketintelligence.vercel.app/macro/inflation) | CPI hero, momentum (1M/3M/6M/YoY), basket pie, WPI decomposition |
| [/macro/rates-liquidity](https://getmarketintelligence.vercel.app/macro/rates-liquidity) | RBI watch, G-Sec, liquidity ops links, M3/M0, bank credit |
| [/macro/fiscal](https://getmarketintelligence.vercel.app/macro/fiscal) | Tax/GDP, debt, GST/CGA/borrowing links |
| [/macro/consumer](https://getmarketintelligence.vercel.app/macro/consumer) | Auto, FMCG, UPI, cards, housing links |
| [/macro/corporate](https://getmarketintelligence.vercel.app/macro/corporate) | Earnings, OBICUS, credit, IBBI links |
| [/macro/external](https://getmarketintelligence.vercel.app/macro/external) | USD/INR, trade, reserves, FDI |
| [/macro/employment](https://getmarketintelligence.vercel.app/macro/employment) | Unemployment, LFPR, EPFO, PLFS links |
| [/macro/global](https://getmarketintelligence.vercel.app/macro/global) | US/China/EU proxies, crude, DXY, VIX, US 10Y, live global radar |
| [/macro/yields](https://getmarketintelligence.vercel.app/macro/yields) | Full curve + how to read |
| [/macro/commodities](https://getmarketintelligence.vercel.app/macro/commodities) | Per-commodity charts |
| [/macro/currency](https://getmarketintelligence.vercel.app/macro/currency) | All INR crosses with explainers |

Each block uses **ℹ️** tooltips (plain English + linked data source).

---

### 2.8 Markets & India equities

- **[/markets](https://getmarketintelligence.vercel.app/markets)** — US / global quote grid from feed hub
- **[/india-markets](https://getmarketintelligence.vercel.app/india-markets)** — NSE equity table (Upstox live); row opens **security sheet** (quote, depth, candles, fundamentals)

---

### 2.9 Derivatives & IPOs

- **[/derivatives](https://getmarketintelligence.vercel.app/derivatives)** — Options chain / F&O context (underlying selection)
- **[/ipo](https://getmarketintelligence.vercel.app/ipo)** — IPO calendar / pipeline (open-data where available)

---

### 2.10 Quantitative desk

| Module | URL | Purpose |
|--------|-----|---------|
| Allocation | [/allocation](https://getmarketintelligence.vercel.app/allocation) | Class / sector / geography weights |
| Risk | [/risk](https://getmarketintelligence.vercel.app/risk) | Vol, VaR, drawdown, tracking error, risk contribution |
| Attribution | [/attribution](https://getmarketintelligence.vercel.app/attribution) | Brinson-style sector effects (virtual portfolio) |
| Quant | [/quant](https://getmarketintelligence.vercel.app/quant) | Moments, factor-style proxies, distribution views |
| Scenarios | [/scenarios](https://getmarketintelligence.vercel.app/scenarios) | Macro shocks (soft landing, recession, inflation, AI boom, USD surge) |
| Optimizer | [/optimizer](https://getmarketintelligence.vercel.app/optimizer) | Mean-variance / risk-parity style weights on virtual universe |
| Backtest | [/backtest](https://getmarketintelligence.vercel.app/backtest) | Rebalance rules on simulated 2019–2026 factor path |
| Reports | [/reports](https://getmarketintelligence.vercel.app/reports) | Investment-committee style printable summary |

> Virtual portfolios on `/app` and quant modules use a **deterministic factor simulation** for long history unless tied to your live `/portfolio` book.

---

### 2.11 Data feeds transparency

**[/feeds](https://getmarketintelligence.vercel.app/feeds)**

- Aggregated **health** per source (NSE, BSE, RBI, SEC, Yahoo, Massive, Stooq, FRED, World Bank, IMF, OECD, MOSPI, Upstox, …)
- Live **news** RSS merge
- **Macro** series cards
- **Indices** / India live quotes

---

## 3. Data & integrations

### 3.1 India market data (priority)

1. **Upstox** — Quotes, depth, candles, F&O, fundamentals, news (when `UPSTOX_ACCESS_TOKEN` set)
2. **Yahoo Finance** — Fallback quotes & history
3. **TrueData** — Last-resort India quotes (optional credentials)
4. **NSE** — Breadth, indices, FII/DII, corporate actions (session-aware JSON)

### 3.2 US market data

1. **Massive** — US snapshots, daily bars, indices (`MASSIVE_API_KEY`)
2. **Yahoo Finance** — Fallback
3. **SEC EDGAR** — Filings RSS / company links

### 3.3 Macro & economics

- **FRED** (CSV + optional API key)
- **World Bank** · **IMF** · **OECD**
- **MOSPI / data.gov.in** — CPI, WPI
- **RBI** — Links and bulletin-oriented rows

### 3.4 Research intelligence (open only)

- Google News RSS (symbol-scoped)
- Curated external portals (no paid research PDF scraping)

---

## 4. Portfolio metrics specification

All **[/portfolio](https://getmarketintelligence.vercel.app/portfolio)** performance, risk, drawdown, and relative metrics are computed by:

- **Spec document:** [`docs/market_intelligence_metrics_specification.md`](docs/market_intelligence_metrics_specification.md)
- **Engine:** `src/lib/my-portfolio/metrics-spec-engine.ts`
- **Orchestration:** `src/lib/my-portfolio/metrics.ts`

Sections covered include:

1. Performance (absolute return, CAGR, TWR, IRR, rolling, active return)
2. Risk-adjusted (Sharpe, Treynor, Sortino, Jensen α, IR, Calmar, Sterling, Burke, Omega, κ₃, M², appraisal)
3. Market risk (β, α, σ, historical VaR/CVaR, TE, downside deviation)
4. Drawdown (MDD, average DD, duration, recovery, recovery factor)
5. Relative (active share, geometric capture, batting average)
6. Construction (concentration, HHI, N_eff, exposure — long-only assumptions documented)
7. Attribution & factors — where data exists; otherwise marked N/A/approx

Daily equity series use **A = 252** and documented risk-free handling (§0.1).

---

## 5. API surface (selected)

| Endpoint | Description |
|----------|-------------|
| `GET /api/feeds/hub` | News, quotes, macro, health |
| `GET /api/feeds/india-dashboard` | Full India desk payload (`?quick=1` for fast path) |
| `GET /api/feeds/search/symbols?q=` | NSE + US symbol search |
| `GET /api/feeds/research/[symbol]` | Research detail + intelligence |
| `GET /api/macro/india` | Macro hub (regime + sections) |
| `GET /api/macro/tape` | Yield curve, commodities, FX, transmission, briefing seed |
| `GET /api/macro/ticker` | Live stream ticker items |
| `GET /api/feeds/massive/status` | Massive API connectivity |
| `GET /api/portfolio/analysis` | Holdings metrics (auth) |
| `GET /api/feeds/yahoo/history?symbol=&range=` | Chart history proxy |

---

## 6. Run locally

```bash
git clone https://github.com/debmukdm-jioinstitute/MARKET-INTELLIGENCE.git
cd MARKET-INTELLIGENCE
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production deploy (Vercel):

```bash
npx vercel --prod
```

---

## 7. Environment variables

| Variable | Purpose |
|----------|---------|
| `MASSIVE_API_KEY` | US market data (Massive.com) |
| `UPSTOX_ACCESS_TOKEN` | India live quotes, depth, research |
| `FRED_API_KEY` | Optional FRED API (CSV fallbacks exist) |
| `ALPHA_VANTAGE_API_KEY` | Optional US quote fallback |
| `DATA_GOV_IN_API_KEY` | India open data (default public key in repo) |
| `TRUEDATA_USERNAME` / `TRUEDATA_PASSWORD` | India quote last resort |
| Database URL (Neon) | Portfolio holdings persistence |

See `.env.example` if present; configure secrets on Vercel for production.

---

## 8. Tech stack

- **Framework:** Next.js 16 (App Router) · React 19 · TypeScript
- **UI:** Tailwind CSS 4 · shadcn/ui · Radix · Lucide
- **Charts:** Recharts · Lightweight Charts (candles)
- **Data:** Server routes + cached fetchers (`src/lib/feeds/*`, `src/lib/macro/*`, `src/lib/my-portfolio/*`)

---

## License & disclaimer

Market data is **indicative** from public and licensed APIs; delays and gaps may apply. Metrics and transmission maps are **educational** — not investment advice. Verify material decisions against official exchange and regulator sources.
