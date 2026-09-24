---
name: web-scraper
description: Find, probe, and wire public data sources (market, macro, micro; India-first, global too) into the Market Intelligence site so values refresh automatically. Use when asked to add/refresh/fix a data feed, scrape a site, replace a hardcoded or link-out metric with live data, or audit which sources work.
---

# web-scraper — Market Intelligence data collection

Registry: `.claude/skills/web-scraper/sources.json` (every candidate source, tier, wired?).
Probe: `node scripts/probe-sources.mjs` (reachability from this machine; run before trusting any source).

## Source priority (always pick the highest tier that has the data)
1. **api** — documented JSON/CSV (World Bank, IMF, FRED, BLS, ECB, SEC, Yahoo chart). Stable, no scraping.
2. **file** — fixed download URL (AMFI NAVAll.txt, CBOE VIX CSV, CFTC COT). Parse text/CSV.
3. **keyed** — free API key (data.gov.in, EIA, Upstox). Key in env, never in repo.
4. **html** — scrape only if nothing above exists (RBI, NPCI, PPAC, NSE, NSDL). Fragile: isolate parser, fail soft.
5. **paid** (CMIE) — never scrape; needs licence.

## Terms-of-service tag (`tos` field in sources.json)
- **open**: free/public data, fetch freely (Damodaran, EDGAR, FRED, World Bank...).
- **tolerated**: public exchange endpoints; polite, cached, cookie-aware fetch (NSE, BSE).
- **restricted**: ToS bars scraping or login-gated (Screener, Trendlyne, Chartink, Finviz, StockAnalysis, Investing.com, Sensibull, Opstra). Do NOT scrape into the site. Link-out, or compute the same figure from open sources.
- **paid/embed**: licence needed (TIKR, Quartr, Koyfin) or official widgets only (TradingView).

## Rules
- Respect robots.txt/ToS; send a real User-Agent; cache; never hammer (NSE needs cookie warm-up — reuse `src/lib/feeds/india/nse-session.ts`).
- Reuse existing plumbing: `feedFetch` in `src/lib/feeds/http.ts`, sources in `src/lib/feeds/sources/*`, Postgres mirror pattern in `src/lib/datagov/*`.
- Every value carries `source: {provider, url, asOf}` (the `MacroRow`/`MacroMetric` shape). Failure → `current: null`, direction `"na"`, never fake numbers. UI already shows "unavailable".
- Scraper output must be validated (zod is installed) before it is written; reject out-of-range values (e.g. repo rate outside 0–15%).
- Keep last-good value in Neon; a failed scrape must not overwrite it.
- README rule: mark each panel 🟢 live / ⚪ static honestly. Update README §14 when a source is wired.

## Workflow to wire a new metric
1. Find it in `sources.json` (or add an entry). Run the probe.
2. Write `src/lib/feeds/sources/<id>.ts` returning `MacroRow`.
3. Add to the relevant builder (`src/lib/macro/build-hub.ts`, `src/lib/feeds/india/build-dashboard.ts`).
4. Cron: add to `vercel.json` + `src/app/api/cron/<name>/route.ts`, guarded by `CRON_SECRET` (copy `cron/datagov/route.ts`). Vercel Hobby: daily max, 60s.
5. `npx tsc --noEmit`, `npm run build`, hit the route locally, verify value vs the official page.
6. Commit; push to `main` → Vercel auto-deploys.

## Collector framework (built)
`src/lib/collector/`: one file per source in `sources/`, each returns `SeriesResult[]`; `run.ts` runs them independently (failure isolated, last-good kept); `store.ts` = Neon tables `collected_series` / `collected_obs` + `latestPoints()` for panels. Cron `/api/cron/collect` (daily 03:15 UTC; `?only=rbi,ecb`, `?dry=1` to validate without writing). Status: `/api/collector`, history `/api/collector?id=rbi_repo`.
Wired: rbi, cboe-vix, cftc-cot, bls, ecb, amfi, damodaran. To add one: new file in `sources/`, register in `COLLECTORS`, dry-run it, read it in a panel via `latestPoints`.

## Known gaps (hardcoded / link-out today) → fix targets
GST collections (PIB), fiscal deficit (CGA), UPI stats (NPCI), fuel demand (PPAC), FPI flow history (NSDL; NSE only gives today), 5D/1M/YTD FII-DII, India yield curve tenors, PMI, IIP, forex reserves (RBI WSS), MF NAV (AMFI).

## Limits (be honest with the user)
Some sources block automated access (BSE 403, GST portal 403), some are slow/blocked from certain networks (NSE, Stooq, data.gov.in timed out from the dev Mac — Vercel egress may differ), and HTML scrapers break when sites redesign. "Fully automatic" = scheduled + fail-soft + monitored, not zero-maintenance.
