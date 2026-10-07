/**
 * Single source of truth for price-chart colour + period move.
 *
 * INVARIANT (do not change — see README "Chart colour & change invariants"):
 *   - 1D: baseline is the PREVIOUS CLOSE (quote.price - quote.change), never the
 *     first intraday tick. Chart colour, "1D move" and the header badge must
 *     therefore always agree. Day closed −0.13% ⇒ chart is RED.
 *   - 1W / 1M / 1Y: baseline is the first point of the series.
 *   - Zero move counts as "up" (green); anything < 0 is red.
 */
export type ChartMove = {
  /** true ⇒ green, false ⇒ red. */
  isUp: boolean;
  /** Absolute move in index points / currency units (signed). */
  change: number;
  /** Fractional move (0.0013 = 0.13%), signed. */
  changePct: number;
  baseline: number;
  end: number;
};

export type DayQuote = { price: number; change: number } | null | undefined;

export function computeChartMove(
  values: readonly number[],
  opts: { isIntraday: boolean; quote?: DayQuote },
): ChartMove | null {
  if (!values.length) return null;
  const q = opts.quote;
  const useQuote =
    opts.isIntraday && q != null && Number.isFinite(q.price) && Number.isFinite(q.change) && q.price - q.change > 0;
  const end = useQuote ? q.price : values[values.length - 1];
  const baseline = useQuote ? q.price - q.change : values[0];
  const change = end - baseline;
  return {
    isUp: change >= 0,
    change,
    changePct: baseline > 0 ? change / baseline : 0,
    baseline,
    end,
  };
}
