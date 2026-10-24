# TASKS: finish the TipSheet-grade data + charts build
Repo: `debmukdm-jioinstitute/MARKET-INTELLIGENCE` (branch `main`, deploys to https://getmarketintelligence.in via Vercel on push). Full original spec: `CLAUDE_BUILD_SPEC.md` (owner has it). This file is self-contained.

## 0. Read first (non-negotiable)
- `AGENTS.md`, `CLAUDE.md`, `docs/TYPOGRAPHY.md`. Next.js 16 differs from training data: read `node_modules/next/dist/docs/` before writing routes.
- **Google Sans only.** No `font-mono`, serif, or other fonts. Use `tabular-nums` for figures. `npm run check:typography` must pass.
- **No unstable SWR fetchers** (module-level loader or `useCallback`). `npm run check:react-loops` must pass.
- **Never fabricate data.** No source data = chart says "Source unavailable". Never coerce null to 0, never invent missing dates.
- **No guessing units or columns.** Download a real sample first, save it in `scripts/ts-ingest/__fixtures__/`, write the parser against it, and test on it.
- New market/macro data features need a read-only MCP tool in `src/lib/mcp/tools-site.ts` (see `get_ts_indicator`) and an entry in `src/lib/help/mcp-tool-guide.ts`. New nav pages must also be listed in `src/lib/nav-columns.ts` and in a lesson's tool list (`src/lib/learn/content/m10-data-trust.ts`) or `curriculum.test.ts` fails.
- Customer emails: no em dashes (not used by this work).
- Cron jobs live in GitHub Actions only. Do not add Vercel crons.

## 1. What already exists (do not rebuild)
| Area | Location |
|---|---|
| Theme tokens, `.ts-chart` | `src/app/globals.css` (bottom) |
| Chart components (`TsChart`, `TsLine`, `TsIndicator`, `TsBars`, `TsRange`, `RangeProvider`, `TsEvents`, `LazyMount`, `ChartActions`) | `src/components/ts-charts/` |
| Registry (chart id to series ids) | `src/lib/ts-charts/registry.ts` |
| Transforms, formatting, stats (tested) | `src/lib/ts-charts/{transform,format}.ts` |
| Chart payload builder (DB to JSON, band, records) | `src/lib/ts-charts/server.ts` |
| APIs | `/api/ts/chart/[id]`, `/api/ts/i/[slug]/data.csv`, `/api/ts/status`, `/api/ts/events`, `/api/ts/ingest-meta`, `/api/revalidate` |
| Auto chart panel per route | `src/components/ts-charts/ts-route-panel.tsx` (mounted in `src/app/(portal)/layout.tsx`; shows every registry chart whose `page` or `also` equals the route) |
| Ingest runner | `scripts/ts-ingest/{run,sources,parsers,http,dates}.ts`, tests in `ts-ingest.test.ts` |
| Workflow | `.github/workflows/ts-ingest.yml` (schedule maps to `--only=` ids) |
| DB | `collected_series`, `collected_obs` (+ `ts_*` tables, see `scripts/migrations/2026-10-ts.sql`) |

**To add a numeric source:** (1) add a parser in `parsers.ts` returning `SeriesResult[]` with ids `ts_<source>_<metric>`; (2) add a `SourceCfg` row in `sources.ts` (`urls`/`reqs`, `anchorSeries`, `lagDays`, `dataset`); (3) add fixture + test in `ts-ingest.test.ts`; (4) add chart rows to `registry.ts` with `page` (and `also`); (5) add the id to the schedule map in `ts-ingest.yml`. The route panel then shows the chart on that page with no page edit.
**Events (calendar rows)** use `events: true` + an `EventParser` (see `nseHolidays`).
**Series categories allowed by ingest:** `market | macro | rates | valuation | positioning | funds`.
**Fetch rules:** UA `Mozilla/5.0 (MarketIntelligence)`, 1 s between requests per host, retries 2/8/30 s, NSE needs cookie warm-up (handled by `nseCookie: true`).

## 2. Known facts from live runs (24 Oct 2026)
Working: nse_fiidii, nse_participant_oi, nse_bhavcopy, nse_allindices, nse_holidays, nse_corp_actions, 7+6 FRED series, ecb, bis, worldbank.
Blocked from GitHub runners (do not retry blindly): `niftyindices.com` Backpage endpoints (return home page, HTTP 200), `sdmx.oecd.org` (HTTP 500 via Cloudflare). Parked in `DISABLED_SOURCES`.
Unverified, first thing to check: `nse_indexhistory` (`/api/historical/indicesHistory`). Run `ts-ingest.yml` with `only=nse_indexhistory since=2015-01-01`; if the parser fails, read the log, fix against the real response.
NSE `fiidiiTradeReact` returns only the latest day, so FII/DII history accrues one day per run.

## 3. Tasks (do in order; one commit per task; keep `npm test`, `npx tsc --noEmit`, `npm run lint` clean on files you touch)

### T0. Verify the existing build (30 min)
- [ ] Run `nse_indexhistory` workflow; fix parser/URL until `ts_niftyidx_*_px` fills. Acceptance: `/api/ts/chart/idx.growth` returns rows for 4 indices.
- [ ] Open the live pages `/Home`, `/markets/india`, `/markets/breadth`, `/markets/derivatives`, `/macro/global`, `/macro/currency`, `/macro/stress`, `/valuation`, `/activity`, `/indicators/us10y`, `/data/status`. Confirm charts render with real latest dates, theme toggle recolours, range chips work, CSV download works, no console errors. Fix what breaks.

### T1. AMFI (unlocks `/funds`, `/etf`)
Sources: `https://portal.amfiindia.com/spages/NAVAll.txt` (`;`-separated, section headers without `;`), AMFI monthly report xlsx pages (AUM by category, SIP inflow/stoppage ratio, net flows, folios, NFO collections, state-wise and age-wise).
- [ ] Download real samples to fixtures. Parsers: `amfiNav` (store only a curated set: benchmark index funds and ETFs by ISIN list), `amfiMonthly` (convert lakh to crore, /100; locate header rows by label, not index).
- [ ] Registry: `i.sip_inflow`, `i.sip_stoppage`, AUM line, flows bars, NFO bars, direct-plan share.
- [ ] Pages: `/funds` (+ `categories`, `distribution`, `owners`, `passive`, `states`, `size`) as thin shells; charts come from the route panel. Add to nav, learn lesson, MCP tool list.
- [ ] `/etf`: premium/discount to NAV (bhavcopy ETF close joined with AMFI NAV by ISIN), tracking difference, traded value. Add an ETF ISIN list file and extend `nseBhavcopy` to emit per-ETF close series.

### T2. MoSPI macro (CPI, WPI, IIP, GDP, PLFS)
Source: eSankhyiki API `https://api.mospi.gov.in/api/{cpi,iip,wpi,nas,plfs}/...` (portal `https://esankhyiki.mospi.gov.in/`). Existing code: `src/lib/collector/sources/india-macro`.
- [ ] Fetch real responses from the runner, save fixtures, parse. Series `ts_mospi_*`. Mark revised months with `meta.revised`.
- [ ] Registry indicators: `i.cpi_yoy`, `i.core_cpi`, `i.wpi`, `i.iip`, `i.gdp_real`, `i.plfs_ur`; stacked bars for CPI contributions by group. Pages: `/macro`, `/macro/india` (route panel).

### T3. RBI + credit
Sources: RBI DBIE (`https://data.rbi.org.in/DBIE/`), WSS (existing `src/lib/collector/sources/rbi.ts`, `rbi-market.ts`).
- [ ] Parsers for CRR/SLR, call money vs repo, liquidity (LAF net), real repo, MPC votes (`/macro/rbi`); credit and deposit growth, sectoral credit heat, NBFC credit, WALR (`/intelligence/credit`). Document the exact DBIE download URLs in code comments.

### T4. Flows and ownership
- [ ] NSDL FPI: `https://www.fpi.nsdl.co.in/web/Reports/Latest.aspx`, `/Monthly.aspx`, fortnightly sector report (ASP.NET html tables, Rs crore). Series `ts_nsdl_fpi_net_equity_m`, debt, sector. Registry `i.fpi_net_eq` on `/intelligence/institutional` (also a bars chart of monthly equity + debt).
- [ ] Cumulative flows by investor type (FII, DII, MF, retail) and ownership shares promoter/FII/DII/MF/retail (`share` kind) on `/intelligence/institutional` and `/intelligence/promoters`. Source: existing shareholding collector + NSE shareholding.
- [ ] NSDL/CDSL depository investor counts.

### T5. Derivatives and leverage
- [ ] NSE MTF: `https://nsearchives.nseindia.com/archives/equities/margin/Margintrdg_{DDMMYY}.zip`. **Check units in the file before converting.** Series MTF book, book/market cap, net exposure; pages `/leverage`, `/leverage/mtf`. Scanner: add MTF context column from per-symbol funded amounts.
- [ ] `/markets/derivatives`: premium to cash, put-call ratio, OI to market cap, retail F&O share, "who trades" `share` chart. Sources: NSE business growth, Market Pulse PDF (`pdftotext -layout`; store raw text hash).

### T6. Rates and bonds
- [ ] NSE WDM `https://nsearchives.nseindia.com/content/historical/WDM/{YYYY}/{MON}/wdmlist_{DDMMYYYY}.csv` and CBM `cbm_trd{YYYYMMDD}.csv`. Build the traded G-sec curve (maturity vs yield, `curve` kind in `ts-bars`, scatter) and history of curves on `/macro/yields`.

### T7. Remaining pages and derived metrics
- [ ] `/macro/global/[iso]` country pages (23 countries): GDP, CPI, policy rate, 10Y, CB assets/GDP, credit gap (BIS `WS_CREDIT_GAP`), unemployment. Use World Bank, BIS, FRED, IMF (`https://api.imf.org/external/sdmx/2.1/`).
- [ ] `/fear-and-greed`: define a transparent formula first (document in `/methodology`): equal-weight z-scores of breadth (advances/declines), 1M price momentum, VIX, put-call ratio, FII flows. Weekly index + 2Y daily + forward outcomes. Home `home.fng` chart.
- [ ] `/research/ipo`: day-1 gain histogram, listings per month, post-listing returns (NSE past issues API `https://www.nseindia.com/api/public-past-issues` + bhavcopy).
- [ ] Gold (WGC) and any other source from the original spec table that is reachable; mark unreachable ones `behind`, never fake.
- [ ] Home: six `TsIndicator compact` tiles (`i.above200dma`, `i.net_new_highs`, `i.nifty50_pe`, `i.fpi_net_eq`, `i.sip_inflow`, `i.cpi_yoy`), 2-col grid under 640px. Breadth indicators need 200/50-day averages: store daily closes for the NSE universe or compute in the ingester from stored bhavcopy closes.
- [ ] `/markets/india` index picker over the 119 NSE indices (extend `NIFTY_INDICES` and add px/pe/pb per index).

### T8. Admin, health, docs
- [ ] Populate `ts_indicator_stats` after each ingest (use `indicatorStats` in `transform.ts`); `--health` mode in `run.ts` recomputing states; fail the daily 08:00 IST health run when any dataset is `failing` for 3 runs.
- [ ] `/data` dataset catalogue from `ts_dataset_status`; `/data/export` includes new series; `/methodology` per-series method notes.
- [ ] Restyle `/macro/stress`, `/stress/backtest`, `/scenarios`, `/transmission` with `TsLine` + band (data stays from existing models).

### T9. Quality gates
- [ ] Add Playwright (`npx playwright test`; Chromium is pre-installed at `/opt/pw-browsers`): each chart route returns 200, has at least one `.ts-chart svg path` when data exists, no console errors; projects 360x780, 390x844, 414x896 with `scrollWidth <= innerWidth`.
- [ ] Render tests (vitest + jsdom) for `TsIndicator` (end dot, band label, position text) and `TsLine` (end labels, narrow legend).
- [ ] Lighthouse mobile (`npx @lhci/cli autorun --collect.settings.preset=mobile`) on `/Home`, `/markets`, `/macro`, `/funds`, `/indicators/nifty50_pe`: Performance >= 90, Accessibility/Best Practices/SEO >= 95. Fix and redeploy if below.

## 4. Definition of done (per task)
1. Fixture from a **real** response committed; parser tested on it.
2. `npx tsc --noEmit && npm run lint` clean for touched files; `npm test` green; `npm run build` succeeds.
3. Workflow dispatched for the new source (`gh workflow run ts-ingest.yml -f only=<id> -f since=<date>`); log shows `error: null` and non-zero `obs`.
4. Chart visible on the target route on prod after Vercel deploy `success`; "Source unavailable" shown when empty.
5. Commit message `feat(ts-ingest): ...` or `feat(pages): ...`; push to `main`.

## 5. Final report to owner
Commits, deploy status, per-source status table (works / blocked / needs sample), Lighthouse scores, anything not done.
