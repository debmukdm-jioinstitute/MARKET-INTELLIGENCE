<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Customer emails: no em dashes (required)

Never put an em dash (`—`, `&mdash;`, `&#8212;`) in any email sent to a customer (subject, body, signature, text part). Use commas, colons, periods or parentheses; sign off `Debabrata`. All sends must go through `sendTransactionalEmail` / `sendNewsletter` in `src/lib/admin/email.ts`, which strip em dashes via `src/lib/email-copy.ts` as a safety net. Policy: `docs/EMAIL_STYLE.md`.

## Typography (required)

**Google Sans is the only allowed typeface** in this repository — UI, emails, static HTML, and agent-generated markup. Do not import `Google_Sans_Code`, use `font-mono` / `font-serif`, or set `font-family` to system fonts, Roboto, Product Sans, or monospace stacks.

- Policy: `docs/TYPOGRAPHY.md`
- Shared constant: `src/lib/typography.ts`
- Verify: `npm run check:typography` (part of `npm run lint`)

## React update loops (required)

**React error #185** (`Maximum update depth exceeded`) came from two patterns:

1. **Unstable SWR fetcher** — `const fetcher = async` inside a hook body without `useCallback`, or inline `async` passed to `useSWR`. New function identity every render → endless revalidate → `setState` in fetcher → loop. **Fix:** module-level loader (see `loadIndiaDashboard` in `src/hooks/use-india-dashboard.ts`) or `useCallback` with minimal deps.
2. **Effect-synced list selection** — `useEffect(() => { if (!list.includes(x)) setX(list[0]) })` when the list flickers. **Fix:** derive with `pickControlledString` / `pickControlledListItem` from `src/lib/react/pick-controlled-list-item.ts` inside `useMemo`, not `useEffect`.

3. **Unstable `useSyncExternalStore` snapshot** — `getSnapshot()` returning a new object/array when storage unchanged (e.g. `{ ...parsed }` every call). React treats each snapshot as changed → render loop. **Fix:** cache by localStorage raw string (see `getLocalSettings` / `getLocalHoldings` in `src/hooks/use-my-portfolio.ts`). SWR keys should use **primitives**, not settings objects.

CI: `npm run check:react-loops` (part of `npm run lint`).

## Terminal parity (required for new features)

The `mi` terminal app (`public/cli/mi.mjs`, docs at `/help#terminal`) builds its menu from the MCP `tools/list`. When you add or change a website feature that shows market, macro, research, derivatives or scanner data, add or update a matching **read-only** tool in `src/lib/mcp/tools-site.ts` (with `title` and `category`) so it appears in the terminal with no CLI change, and add it to the tool table in `src/app/help/page.tsx`. Do not expose user-specific data (portfolio, alerts, admin) through MCP. Keep tool output reasonably small (flatten or drop huge series). Only touch `mi.mjs` when a tool needs a custom renderer.

## Chart colour & change invariants (DO NOT CHANGE)

Applies to every index / quote chart and quote header (e.g. `/markets/india/[symbol]`). AI coding tools and humans: do not alter this behaviour.

1. **Colour follows the headline move.** If the day's change vs **previous close** is negative the chart, fill and "1D move" are **red**; positive/zero is **green**. A day that closed −0.13% can never show a green chart.
2. **1D baseline = previous close** (`quote.price − quote.change`), *not* the first intraday point. 1W/1M/1Y baseline = first point of the series. All of this lives in one place: `src/lib/chart-direction.ts::computeChartMove` (tests: `src/lib/chart-direction.test.ts`). Never re-derive `isUp` inline from `first`/`last` points.
3. **Always show points AND percent** together, e.g. `−71.95 (−0.13%)`, using `fmtMove(change, pctFraction)` / `fmtChgPts` (`src/lib/format-india.ts`). This covers the detail header, index cards, Market Pulse, Global Radar, Hero, home ticker and indices strip. `changePct` is a FRACTION (0.0013 = 0.13%) — never `.toFixed(2)` it directly. Never show % alone for an index quote when `change` is available. Negative numbers use the true minus sign `−`.
4. The "N points" in "Hover to inspect (N points)" is the number of samples in the plotted series (e.g. 75 five-minute bars for a full NSE session), not a percentage.

## Price bento (DO NOT CHANGE THE DESIGN LANGUAGE)

Every price/quote detail page uses the one shared `PriceBento` (`src/components/price-bento/price-bento.tsx`): coral (down) / mint (up) / ivory (flat) hero on the left, large chart on the right, then Day range, black Previous-close tile and a factual Takeaway tile, on a warm-ivory surface with ink borders, in the site's Google Sans (`font-sans`). Consumers: `/markets/india/[symbol]` (index detail, via `useBentoSeries`) and `/research/[symbol]` (any searched/clicked stock, via `StockPriceBento`; India + US). Do not re-introduce a different chart/card on those pages and do not fork the component.

- All state maths lives in `src/lib/price-bento/model.ts` (tested): daily direction/colour/words from the **unrounded** `close − previousClose` (signed zero normalised), previous close via `derivePrevClose` (handles Yahoo fallbacks that report `change = 0` with a real `changePct`), range-marker `(v−low)/(high−low)` clamped, unit-aware formatting (index → `points`, India → ₹, US → $), takeaway sentence. Never inline this logic in a page.
- 1D chart baseline = previous close (dashed line + label); 1W/1M/1Y colour by the range's own first→last and say so ("Past week: +0.91%") — never imply the daily change is a range return.
- No tiny uppercase eyebrow labels on tiles (semantic `sr-only` headings only). Missing data renders honest states with Retry; never coerce null to 0, never ship the brief's example prices as fallback.
- Provider credit ("Data: …") stays. The surrounding page keeps the official Mi header/logo; do not redraw it inside the component.

## Home five-tool bento (DO NOT CHANGE THE DESIGN LANGUAGE)

`/Home` → "Five ways to find your edge" is `src/components/homedashboard/SignatureFive.tsx` with artwork in `tool-art.tsx`. Layout: coral **AI Desk** card spanning two rows (≈45%) + blue **Stock Scanner**, lavender **Trade Lab**, yellow **Alerts**, mint **Options Flow** in a 2×2 grid; 2-column under 1100px, 1-column under 700px. Warm ivory canvas, ink 1px borders, black Google Sans (`font-sans`) text, white inset strips, tinted full-width CTAs with arrows. Do not revert to the old equal white cards, add black cards/emoji/photos, or redraw the Mi logo here (the site header carries it).

- Routes/actions are fixed: `/research/ai-desk`, `/intelligence/scanner`, `/intelligence/trade-lab`, `/intelligence/alerts?new=1`, `/research/options-flow` (with the existing `homeActions` mission/bonus hooks).
- Strips bind to real data only (trending debate, 52-week breakout count, the user's own virtual P&L, active alert count, today's option flags). No fixture numbers ("CHALET", "−₹1,56,968", "0 flags") ship; missing data shows neutral copy, never a fake zero.
- Artwork is decorative inline SVG (`aria-hidden`, pointer-inert); keep it clear of text at every breakpoint.

