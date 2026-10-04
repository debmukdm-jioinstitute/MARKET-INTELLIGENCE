# The Alpha League — operator runbook

Market Intelligence × Jio Institute. One standalone five-market-day season, one leaderboard,
₹10,00,000 virtual capital per participant. NSE cash equities and ETFs only. Educational,
virtual money, not investment advice. Research summaries are never buy/sell recommendations.

## Required owner inputs before launch

| Configuration                             | Purpose / action                                                                                                                                                                                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `COMPETITION_EMAIL_DOMAINS`               | **Needs owner input.** Comma-separated approved institute domains. Intentionally empty; no Jio Institute domain is guessed. Exact domain matching, no wildcard/subdomain acceptance.                                                                                                                  |
| Five season dates                         | **Needs owner input.** Create through `/admin/competition`. Five ordered weekdays in one week; verify NSE holidays. Opens at 09:15 IST on day 1 and ends 15:30 IST on day 5. No automatic season or sample dates are inserted.                                                                        |
| Finalist count                            | **Needs owner input.** Admin creation requires it; includes Champion. The highest-ranked eligible finisher is Champion, subsequent eligible finalists receive Excellence certificates.                                                                                                                |
| `COMPETITION_DEVICE_SALT`                 | Required private random HMAC salt for basic device fingerprints. Keep stable for the season; never put it in `NEXT_PUBLIC_*`.                                                                                                                                                                         |
| `DATABASE_URL` / existing Postgres config | Existing Neon database. Tables and stored commit function created idempotently through central `ensureSchema()`. Account must have DDL/function/trigger permissions.                                                                                                                                  |
| `AUTH_SECRET`                             | Existing signed-session secret; required in production. Institute emails must represent verified accounts under the site's existing authentication policy.                                                                                                                                            |
| Instrument approvals                      | **Needs operator review.** Add equities/ETFs using the admin screen, verify cash-market classification and circuit status against NSE, then clear circuit-locked checkbox. Unknown instruments fail closed. Symbol must exist in the existing curated list or synced NSE equity instrument master.    |
| `COMPETITION_BLOCKLIST`                   | Optional comma-separated NSE symbols. Dynamic excluded/circuit symbols can also be blocked in the admin table.                                                                                                                                                                                        |
| `COMPETITION_MIN_MEDIAN_TURNOVER`         | Default ₹1,00,00,000 (₹1 crore). Median of prior 20 completed daily closes × volume, checked on each order and cached five minutes. Missing/old history rejects the order.                                                                                                                            |
| `COMPETITION_MIN_PRICE`                   | Default ₹20 penny-stock exclusion threshold. Positive numeric value required.                                                                                                                                                                                                                         |
| `COMPETITION_GOOGLE_SANS_FONT_PATH`       | **Needs owner input for certificates.** Server-readable absolute path to an appropriately licensed Google Sans TTF/OTF. Bundle that asset with deployment and configure Next.js output file tracing if outside the normal traced tree. PDF generation fails clearly without it; no font substitution. |
| `SITE_URL`, `CRON_SECRET` GitHub secrets  | Required for `.github/workflows/alpha-league.yml`. The workflow POSTs the site's snapshot endpoint at 15:50 IST on weekdays. No Vercel cron added.                                                                                                                                                    |
| Kit settings below                        | Optional email hook fulfillment; queue exists independently of Kit configuration.                                                                                                                                                                                                                     |

## Launch and operate

1. Deploy the feature branch after review. Visit `/admin/competition` as an existing signed-in admin.
2. Create the single draft season with the approved five trading dates and finalist count.
   There is a database singleton index: a second season is deliberately rejected.
3. Populate the approved cash equities/ETF list. Review circuit locks every market day and
   update immediately if a scrip locks intraday. Safety reviews expire after 24 hours.
4. Enter known split/bonus/dividend actions **before affected closing snapshots**. The existing
   NSE announcement pipeline is headline/disclosure data, not machine-readable holding adjustments.
5. Open registration. Participants need an approved email domain, an accepted terms version,
   a unique public display name, and the basic device signal. Email sequence opt-in is optional.
   Raw device fields are not stored; a salted HMAC is stored. Shared fingerprints are flagged
   for human review. Email uniqueness is enforced per season.
6. Go live. Orders are permitted only within configured dates and 09:15–15:30 IST sessions.
   Registration is closed once live. Late entrants are not supported.
7. Monitor `/admin/competition`. Review rapid opposite-side trades and synchronized same-symbol
   trades from different accounts, along with device collision flags. Signals are heuristics,
   not proof of misconduct. Record a reason to disqualify; those participants remain visible
   without rank and cannot trade or receive certificates. Mark every investigated flag reviewed.
8. Record the market close on **each of the five dates**. The GitHub workflow or the admin
   button does this. It obtains actual same-day closing daily bars using the existing Trade Lab
   history pipeline. All held symbols need prices before any rows are recorded.
   If data is delayed, retry later **the same day**. No backfill at today's prices. Existing
   snapshots are immutable and repeated calls do not duplicate them. A missed day blocks final
   results; recovery requires a separately audited historical-data repair, not fake values.
9. After day 5 closes and all participants have five snapshots, advance to ended. The board
   and portfolio freeze to the final snapshot. The holdings table uses the recorded final marks.
10. Review winners, activity eligibility, corporate actions, and all anti-gaming flags. Click
    Verify final results. This locks disqualification; certificate issuance requires this step.
11. Enter an eligible participant email and issue their certificate PDF. Verification ID is a
    stored UUID. Public verification: `/alpha-league/verify/<id>`. This reveals only display name,
    season, and award, never email or holdings. Admin handles the Champion's 1-year subscription
    manually; this feature never grants billing/subscription access.

## Scoring and ledger invariants

- All cash and positions are replayed from the append-only `competition_trades` ledger plus
  ex-date adjustments. DB triggers reject UPDATE/DELETE of trades and snapshots.
- BUY consumes gross notional plus friction; SELL credits gross less friction. Cost is
  `ceil(gross × FRICTION_RATE × 100) / 100` with `FRICTION_RATE = 0.0012`, in one config module.
  This simplified brokerage + STT estimate is not a broker-specific tax calculation.
- Order fills use the existing batched `getQuotes` service, never client-supplied marks.
  Quotes must be fresh within two minutes; delayed last-good values may value the live board
  but cannot execute orders. Any missing holding mark makes total value unavailable (`—`).
- BUY post-order symbol value cannot exceed 25% of post-friction portfolio value.
  Reducing an existing overweight position through SELL is allowed. Quantities are whole shares;
  corporate actions can create fractional holdings which retain their economic value.
- Commit takes a competition share lock and participant update lock. Portfolio ledger version
  and season revision must match the versions used in validation. A changed version returns 409
  and requires a refreshed retry. UUID request IDs prevent replay duplicates.
- Final return is `(final value / 1000000 − 1) × 100`. The board ranks by return, Sharpe,
  maximum drawdown, then earlier final trade. Display name is a deterministic final fallback
  only when every specified tiebreak is equal. Non-traders have no final trade timestamp.
- Sharpe uses daily close-to-close arithmetic returns including the initial capital baseline,
  sample standard deviation, zero risk-free rate, and annualization by √252. Zero variance or
  insufficient observations means undefined Sharpe, displayed `—`, sorted after measured values.
  Max drawdown uses the same daily equity sequence and initial baseline, in percent.
- Distinct symbols count both sides of executed trades, including fully exited symbols.
  Fewer than five is prize-ineligible but still ranked. Final eligibility also requires all
  five snapshots and active status. Champion is the first eligible finisher on the return board;
  an ineligible high-return participant can retain a higher numerical board rank without a prize.

## Corporate action convention

One row per symbol/ex-date in `competition_splits`. Ratio is the new/old share multiplier:
2 means a 2:1 split or 1:1 bonus, 1.5 means a 1:2 bonus. A cash dividend credits the **pre-action**
shares held immediately before that day's session, then ratio adjusts shares. Trades after ex-date
use new shares/prices. One combined row must express simultaneous actions consistently.
Existing affected snapshots prevent edits. No automatic adjustment feed, demerger treatment,
rights issues, cash-in-lieu, or dividend withholding is implemented. Review these before launch.

## Research sandbox

`/alpha-league/backtest` requires a real session. It reuses `fetchBars`, RSI and moving-average
indicators from Trade Lab, and the repository's static `NIFTY50_WEIGHTS` reference symbols.
Choose 1–5 years, momentum / RSI / MA-cross conditions, periods, stop loss and take profit.
Signals use the previous bar; entry is the next open. Stop-first handling is conservative when
both stop and target occur in the same bar. Gaps execute at open. Marked daily equity, full equity
curve, total return, max drawdown, win rate and trade count are returned per independent symbol.
The same per-side friction applies. Last open trade closes on the final bar.

A bounded one-attempt request policy and 25-second shared abort deadline return available results
and an explicit unavailable-symbol list. Cache lasts five minutes per input set; no fabricated
series. Cold network performance depends on the upstream provider and must be measured on the
launch deployment. A historical value template is omitted because historical fundamentals aren't
available. Static current/reference constituents produce survivorship bias, histories may be
shorter for recent listings, daily series are split-adjusted and not dividend-adjusted, and stop
fills don't model market impact. This is research, not a portfolio simulation of the position cap.

Send to watchlist uses the existing server-backed personal watchlist, saves up to five researched
symbols, and never auto-trades. The competition ledger stays separate from the regular portfolio.

## Kit integration: four trigger points

No replacement email infrastructure. `competition_events` is an idempotent outbox. Only opted-in
participants get events. `POST /api/admin/competition/events` processes up to 25 pending events
by reusing Kit's tag creation helper and existing v4 client conventions. Configure Kit automations
in its dashboard; each successful tag application is marked delivered, and failures stay queued.

| Trigger      | How queued                                           | Required Kit tag environment variable |
| ------------ | ---------------------------------------------------- | ------------------------------------- |
| Registration | Automatically after successful opted-in registration | `COMPETITION_KIT_REGISTRATION_TAG`    |
| Announcement | Admin Queue announce                                 | `COMPETITION_KIT_ANNOUNCE_TAG`        |
| Reminder     | Admin Queue reminder                                 | `COMPETITION_KIT_REMINDER_TAG`        |
| Standings    | Admin Queue standings, including final standings     | `COMPETITION_KIT_STANDINGS_TAG`       |

Existing `KIT_API_KEY` is required to sync. Use distinct **season-specific** tags so old tag
membership cannot silently suppress Kit triggers. Each event type is once per participant this
season; repeated daily standings campaigns require explicit new event identifiers in a future
change. Do not click sync until the Kit sequences and consent policy are reviewed. This build
queues hooks but does not automatically execute email delivery or subscribe non-consenting users.

## APIs and terminal parity

Public: GET status, GET top-20 leaderboard preview, GET certificate verification.
Real session: POST register/order/backtest/watchlist, GET private portfolio, GET full leaderboard.
Admin: GET/POST `/api/admin/competition`, POST certificate/events. Cron uses a timing-safe
`CRON_SECRET` bearer comparison. Mutation APIs reject cross-origin browser requests. Guest
sessions never read or mutate a shared personal portfolio or register.

Read-only MCP `get_alpha_league_preview` exposes only the public top-20 projection and the
educational disclaimer; it is automatically listed in `/help` and the `mi` terminal menu.
No competition email, device, personal holdings, or order mutation is exposed through MCP.

## Verification

```bash
npm ci
npm run competition:seed
npx tsc --noEmit
npm run lint
npm run build
```

The seed is an isolated offline five-day fixture; it never connects to or pollutes the live database.
It prints four fake participants with hand-checked returns: Champion ₹10,09,940 (0.994%),
Steady/Volatile ₹10,04,940 (0.494%, Sharpe tiebreak), and one-symbol finisher ₹10,00,488 (0.0488%,
ineligible). Checks also cover position cap, cash/share rejection, corporate actions, missing
marks, drawdown/final-trade ties, and a hand-verified next-open backtest.

Optional SQL verification uses a real PostgreSQL engine (PGlite) installed outside the repository,
with **no new production or project npm dependencies**:

```bash
COMPETITION_TEST_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js \
  node scripts/competition/verify-postgres.mjs
```

This checks idempotent DDL, singleton season constraints, append-only triggers, idempotent order
retry, stale ledger-version rejection, disqualification and ended-session guards. Its clock
substitution is limited to the disposable test database; production time and quotes are untouched.

Before launch, run the register → valid order → concentration/cash/blocked rejection → board →
admin disqualification story in a staging deployment with real feed credentials and approved
email accounts. No live Neon credentials are supplied in this build workspace. Actual cold
five-year upstream performance and live circuit-status coverage remain deployment acceptance items.

XP stretch is skipped: the existing award API accepts only predefined catalog actions and has
no competition milestone contract. No arbitrary client-supplied XP award is introduced.
