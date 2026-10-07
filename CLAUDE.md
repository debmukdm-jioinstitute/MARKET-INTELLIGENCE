@AGENTS.md

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

