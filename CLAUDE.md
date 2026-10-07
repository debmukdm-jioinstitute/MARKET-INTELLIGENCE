@AGENTS.md

## Chart colour & change invariants (DO NOT CHANGE)

Applies to every index / quote chart and quote header (e.g. `/markets/india/[symbol]`). AI coding tools and humans: do not alter this behaviour.

1. **Colour follows the headline move.** If the day's change vs **previous close** is negative the chart, fill and "1D move" are **red**; positive/zero is **green**. A day that closed −0.13% can never show a green chart.
2. **1D baseline = previous close** (`quote.price − quote.change`), *not* the first intraday point. 1W/1M/1Y baseline = first point of the series. All of this lives in one place: `src/lib/chart-direction.ts::computeChartMove` (tests: `src/lib/chart-direction.test.ts`). Never re-derive `isUp` inline from `first`/`last` points.
3. **Always show points AND percent** together, e.g. `−71.95 (−0.13%)`, using `fmtMove(change, pctFraction)` / `fmtChgPts` (`src/lib/format-india.ts`). This covers the detail header, index cards, Market Pulse, Global Radar, Hero, home ticker and indices strip. `changePct` is a FRACTION (0.0013 = 0.13%) — never `.toFixed(2)` it directly. Never show % alone for an index quote when `change` is available. Negative numbers use the true minus sign `−`.
4. The "N points" in "Hover to inspect (N points)" is the number of samples in the plotted series (e.g. 75 five-minute bars for a full NSE session), not a percentage.

