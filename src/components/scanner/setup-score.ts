/** Transparent, row-local "setup quality" score for scanner results.
 *
 * The score is computed ONLY from the row's own fields plus the scan's bias —
 * nothing is fetched, estimated, or invented. It is a reading aid, not advice.
 *
 * Formula (0–100):
 *  - Volume vs 20-day average (0–40): volRatio ≥ 2 → 40; ≥ 1.5 → 30; ≥ 1 → 20; else 10.
 *  - Today's move agrees with the scan (0–30): for "buy" scans, up-days earn up to 30
 *    (scaled, capped at a 6% move); "sell" scans mirror with down-days; "watch" scans
 *    get a flat 15 since direction is not the point.
 *  - RSI position (0–30): "buy" scans lose points when RSI is overbought (>70);
 *    "sell" scans lose points when RSI is oversold (<30); "watch" scans get a flat 20;
 *    missing RSI gets 15 (half credit, no guessing).
 */

export type ScanBias = "buy" | "sell" | "watch";

export interface SetupScoreInput {
  volRatio: number;
  changePct: number;
  rsi: number | null;
}

export interface ScorePart {
  name: string;
  points: number;
  max: number;
  why: string;
}

export interface SetupScore {
  score: number;
  label: string;
  parts: ScorePart[];
}

export const SETUP_SCORE_TOOLTIP =
  "Setup score (0–100): volume vs 20-day average (40) + today's move agreeing with the scan (30) + RSI position (30). Computed from this row only — a reading aid, not advice.";

export function setupScore(input: SetupScoreInput, bias: ScanBias): SetupScore {
  const { volRatio, changePct, rsi } = input;

  let volume = 10;
  if (volRatio >= 2) volume = 40;
  else if (volRatio >= 1.5) volume = 30;
  else if (volRatio >= 1) volume = 20;

  let move = 0;
  if (bias === "watch") {
    move = 15;
  } else if (bias === "buy") {
    move = changePct > 0 ? (Math.min(changePct, 6) / 6) * 30 : 0;
  } else {
    move = changePct < 0 ? (Math.min(-changePct, 6) / 6) * 30 : 0;
  }
  move = Math.round(move);

  let rsiPts: number;
  if (rsi == null) {
    rsiPts = 15;
  } else if (bias === "buy") {
    rsiPts = rsi <= 70 ? 30 : rsi <= 80 ? 15 : 5;
  } else if (bias === "sell") {
    rsiPts = rsi >= 30 ? 30 : rsi >= 20 ? 15 : 5;
  } else {
    rsiPts = 20;
  }

  const score = volume + move + rsiPts;
  const label = score >= 75 ? "Strong" : score >= 50 ? "Decent" : score >= 25 ? "Weak" : "Thin";

  const moveDir = bias === "buy" ? "up" : bias === "sell" ? "down" : "either way";
  const parts: ScorePart[] = [
    {
      name: "Volume vs average",
      points: volume,
      max: 40,
      why: `Today's volume is ${volRatio.toFixed(1)}× the 20-day average. More volume means more conviction behind the move.`,
    },
    {
      name: "Today's move",
      points: move,
      max: 30,
      why:
        bias === "watch"
          ? "This scan is direction-neutral, so the day's move counts a flat 15."
          : `The stock moved ${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}% today; this scan looks for moves ${moveDir}, so agreement earns points.`,
    },
    {
      name: "RSI position",
      points: rsiPts,
      max: 30,
      why:
        rsi == null
          ? "No RSI available for this stock, so half credit — no guessing."
          : `RSI ${rsi.toFixed(0)}: ${rsi > 70 ? "running hot (overbought)" : rsi < 30 ? "sold off hard (oversold)" : "in the normal zone"}.`,
    },
  ];

  return { score, label, parts };
}

/** Short "what this means" lines for every figure, used in the table tooltips and the review drawer. */
export const METRIC_MEANINGS: Record<string, string> = {
  ltp: "Last traded price at the latest NSE close. Delayed data — not a live quote.",
  change: "How much the price moved in the latest session. Green is up, red is down.",
  volRatio: "Today's shares traded vs the 20-day average. 2× means twice the usual activity — unusual interest.",
  rsi: "Momentum meter from 0–100. Below 30 = sold off hard; above 70 = running hot.",
  signal: "The exact rule from this scan that the stock matched, in plain words.",
  score: SETUP_SCORE_TOOLTIP,
};
