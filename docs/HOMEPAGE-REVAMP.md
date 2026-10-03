# /Home revamp — implementation and verification

The homepage follows `creator.md`: Welcome, Market Pulse, Brief, Signature Five,
Missions, Smart Money, Learn, Portfolio. Learn is always available, collapsed.
Publishing was explicitly authorized after the original uncommitted-only brief.

## Files

- `src/app/(portal)/Home/page.tsx` — composes the eight sections, preserves the 45-second dashboard refresh and shares portfolio/brief data.
- `src/components/homedashboard/WelcomeStrip.tsx` — first-visit steps, persisted dismissal and First Steps congratulations.
- `src/components/homedashboard/MarketPulse.tsx` — four indices, real candle sparklines, weekday IST session status, breadth and VIX explanations.
- `src/components/homedashboard/BriefTeaser.tsx` — three available headlines, source/time, shared sentiment API and watchlist context.
- `src/components/homedashboard/SignatureFive.tsx` — live teasers with explicit exploration fallbacks for all five destinations.
- `src/components/homedashboard/MissionsCard.tsx` — daily tasks, levels, XP, streak and earned badges.
- `src/components/homedashboard/SmartMoney.tsx` — net flows and patterns based on stored observations.
- `src/components/homedashboard/LearnNudge.tsx` — the three requested existing articles in an accessible disclosure.
- `src/components/homedashboard/PortfolioTeaser.tsx` — condensed existing portfolio model and guest watchlist prompt.
- `src/components/homedashboard/shared.tsx` — section/link presentation and stable, bounded teaser loader.
- `src/components/homedashboard/useHomeProgress.ts` — browser persistence, stable external-store snapshots and minute-aligned IST clock.
- `src/lib/gamification/missions.ts` — pure reward/streak rules and safe storage parsing.
- `src/lib/gamification/__tests__/missions.test.ts` — IST midnight, year boundary, broken streaks, duplicate clicks, levels, welcome steps and bonuses.
- `src/lib/homedashboard/brief.ts` — existing brief contract adapter and current-day symbol mentions.
- `src/lib/homedashboard/insights.ts` — pure market-session, breadth, VIX and flow-pattern rules.
- `src/lib/homedashboard/__tests__/insights.test.ts` — session/threshold boundaries, buy/sell/flip patterns and headline matching.
- `src/lib/feeds/india/types.ts` — optional stored FII/DII observation history on the existing flow row.
- `src/lib/feeds/india/build-dashboard.ts` — reuses the existing collector history inside the existing dashboard response.
- `src/lib/mcp/tools-site.ts` — read-only `get_home_market_insights`, without personal data, for terminal parity.
- `src/lib/help/mcp-tool-guide.ts` — example prompt; the help page's tool table automatically derives this new tool from the registry.

## Data and scope

Nothing faked in the new implementation. Browser QA uses isolated test fixtures
only, never production data substitutions.

- Quote/candle failures render unavailable states. Existing `useCandles` supplies
  actual intraday points with no polling; the dashboard hook retains 45 seconds.
- Brief source-directory placeholders are excluded from news. Published brief
  timestamps are identified as brief time, not fabricated article timestamps.
- The existing sentiment API can use a rule fallback and does not expose model
  provenance per result; the UI explicitly discloses this limitation.
- Scanner counts refer to the existing 52-week-high scanner and today's bar.
  Options counts refer to recorded flags, not an invented count of executed trades.
- Smart Money describes consecutive **recorded sessions**; missing sessions and
  exchange holidays are not assumed to have complete coverage. Regular weekday
  market hours are labelled accordingly.
- Existing virtual portfolio valuations are reused. No paper-trading engine or
  new cash balance is created. The requested virtual-cash teaser remains an
  exploration fallback.
- Welcome tracking is separate from daily debate tracking. First Steps requires
  brief, scanner and watchlist navigation. Tool navigation earns the exploration
  rewards specified in the brief; it does not assert that a trade or alert was executed.
  Homepage XP is labelled separately from the newer account-level XP ledger.
- No `data-track`/`data-entity` convention exists in this checkout; the conditional
  analytics addition was skipped as specified.
- No route moves, signature-page changes, auth/HF/collector implementation changes,
  native dependencies or fabricated historical data. The unused HomeExploreHub
  remains in the repository; it is not mounted by Home.

## Verification

- TypeScript: `npx tsc --noEmit` passed.
- ESLint: every changed TypeScript/TSX file passed.
- Typography and React-loop guards passed.
- Unit tests: 71 suites / 381 tests passed, using the CI exclusions for the two
  pre-existing network-dependent brief and notification suites.
- Production build passed after incorporating the latest upstream main changes.
  Existing build warnings: Google Sans fallback metrics unavailable; an unrelated
  disclosure source fell back after an upstream DNS failure.
- Browser, production build: eight sections render with aborted API requests;
  no infinite spinners or uncaught page errors.
- Mission navigation: 10 visit XP + 60 daily mission XP; First Steps adds 60 XP
  after watchlist navigation; streak, badge, dismissal and XP persist on reload.
- 390px viewport with dark OS and forced dark ancestor: homepage remains light;
  no horizontal overflow. Learn disclosure opens and closes.
- Populated fixtures: all four charts, three headlines, sentiment/watchlist chips,
  scanner/alerts/options teasers, flow patterns, signed-in NAV and top three holdings passed.
- Blocked localStorage: session fallback renders without uncaught errors.
