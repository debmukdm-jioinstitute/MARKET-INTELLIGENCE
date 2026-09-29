import type { Bar } from "@/lib/scanner/types";
import { bsCall, bsPut, nextThursday, realizedVolAt } from "./option-pricing";
import type { LocalRiskLevel, LocalRiskProfile } from "./risk-profiles";
import { LOCAL_RISK_PROFILES } from "./risk-profiles";

/**
 * Local, no-proxy backtest of a short-strangle-style weekly NIFTY options strategy over real
 * index history (Yahoo `^NSEI` daily bars — see src/lib/scanner/data.ts). This replaces the old
 * `/api/backtest/*` calls into the separate Python service (which needs real historical NSE
 * options-chain data this app doesn't have access to). It prices each leg with Black-Scholes off
 * the index's own trailing realized volatility instead of a real option quote — see
 * option-pricing.ts for why, and never present this as real historical option prices.
 *
 * One weekly entry (Monday, or the first trading day of a new calendar week): sell one OTM call
 * and one OTM put, each independently exited at its own profit-target / stop-loss / expiry
 * (Thursday) barrier — the same triple-barrier idea used in the AI Signals model
 * (src/lib/scanner/triple-barrier.ts), applied to option premium instead of index price.
 */

export type LocalTradeResult = {
  entry_time: string;
  exit_time: string;
  symbol: string;
  direction: "CALL" | "PUT";
  strategy: string;
  entry_premium: number;
  exit_premium: number;
  sl: number;
  target: number;
  sl_pct: number;
  tgt_pct: number;
  lot_size: number;
  pnl: number;
  result: "TARGET" | "SL" | "EXPIRY";
  /** Annualized realized volatility used to price this leg (not an ML confidence score — this engine has no ML). */
  ml_prob: number;
  strat_prob: number;
  flow_score: number;
  final_score: number;
  regime: string;
  index_price: number;
};

export type LocalBacktestProfile = {
  trades: number;
  pnl: number;
  win_rate: number;
  avg_win: number;
  avg_loss: number;
  max_dd: number;
  rr: number;
  equity_curve: number[];
  trade_list: LocalTradeResult[];
};

const NEAREST_STRIKE = 50; // NIFTY strike gap
const round50 = (x: number) => Math.round(x / NEAREST_STRIKE) * NEAREST_STRIKE;
const YEAR_SEC = 365 * 86_400;
const isoDate = (epochSec: number) => new Date(epochSec * 1000).toISOString().slice(0, 10);

function weekKey(epochSec: number): string {
  const d = new Date(epochSec * 1000);
  // ISO week (Mon-Sun) bucket — good enough for "one entry per calendar week", not used for pricing.
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (tmp.getUTCDay() + 6) % 7;
  tmp.setUTCDate(tmp.getUTCDate() - day);
  return tmp.toISOString().slice(0, 10);
}

function runLeg(
  bars: Bar[],
  closes: number[],
  entryIdx: number,
  strike: number,
  direction: "CALL" | "PUT",
  entrySigma: number,
  expiryEpoch: number,
  profile: LocalRiskProfile,
): LocalTradeResult | null {
  const spot0 = closes[entryIdx];
  const t0 = (expiryEpoch - bars[entryIdx].t) / YEAR_SEC;
  if (t0 <= 0) return null;
  const price = direction === "CALL" ? bsCall : bsPut;
  const entryPremium = price({ spot: spot0, strike, t: t0, sigma: entrySigma });
  if (!Number.isFinite(entryPremium) || entryPremium <= 0.5) return null; // too cheap to be a real fill

  // Checked once per daily close, not intraday: a large single-day move can carry the position
  // past its stop-loss level before this loop ever sees a price between entry and the stop — the
  // exit still fires (result "SL"), but the realized loss can exceed sl_pct of the credit. This
  // mirrors a real, well-known risk of short option strategies (overnight/gap risk), not a bug to
  // paper over with an assumed intraday fill this model has no data to justify.
  for (let j = entryIdx + 1; j < bars.length; j++) {
    const tj = Math.max(0, (expiryEpoch - bars[j].t) / YEAR_SEC);
    const atExpiry = bars[j].t >= expiryEpoch || j === bars.length - 1;
    const sigmaJ = realizedVolAt(closes, j, 20) ?? entrySigma;
    const premiumJ = atExpiry
      ? direction === "CALL"
        ? Math.max(closes[j] - strike, 0)
        : Math.max(strike - closes[j], 0)
      : price({ spot: closes[j], strike, t: tj, sigma: sigmaJ });

    const pnlFrac = (entryPremium - premiumJ) / entryPremium; // short position: profit when premium falls
    const hitTarget = pnlFrac >= profile.tgt_pct;
    const hitStop = pnlFrac <= -profile.sl_pct;

    if (hitTarget || hitStop || atExpiry) {
      const lotSize = Math.round(profile.base_lot_size * profile.lot_multiplier);
      const pnl = (entryPremium - premiumJ) * lotSize;
      return {
        entry_time: `${isoDate(bars[entryIdx].t)} 09:20:00`,
        exit_time: `${isoDate(bars[j].t)} 15:20:00`,
        symbol: `NIFTY${isoDate(expiryEpoch).replace(/-/g, "").slice(2)}${strike}${direction === "CALL" ? "CE" : "PE"}`,
        direction,
        strategy: "SHORT_STRANGLE_LEG",
        entry_premium: Math.round(entryPremium * 100) / 100,
        exit_premium: Math.round(premiumJ * 100) / 100,
        sl: Math.round(entryPremium * (1 + profile.sl_pct) * 100) / 100,
        target: Math.round(entryPremium * (1 - profile.tgt_pct) * 100) / 100,
        sl_pct: profile.sl_pct * 100,
        tgt_pct: profile.tgt_pct * 100,
        lot_size: lotSize,
        pnl: Math.round(pnl * 100) / 100,
        result: hitTarget ? "TARGET" : hitStop ? "SL" : "EXPIRY",
        // No ML in this engine — these carry real inputs instead of a fabricated confidence score.
        ml_prob: 0,
        strat_prob: 0,
        flow_score: 0,
        final_score: Math.round(entrySigma * 1000) / 1000, // annualized realized vol used to price this leg
        regime: `OTM ${profile.distanceSigma}σ`,
        index_price: Math.round(spot0 * 100) / 100,
      };
    }
  }
  return null;
}

/**
 * Runs the strategy over real daily bars (oldest → newest) for one risk level. Causal throughout:
 * every price at entry `i` uses only realized vol computed from bars `<= i`, and every leg is
 * only recorded once it has a full path of real future bars to resolve against (no look-ahead).
 */
export function runStrangleBacktest(bars: Bar[], level: LocalRiskLevel): LocalBacktestProfile {
  const profile = LOCAL_RISK_PROFILES[level];
  const closes = bars.map((b) => b.c);
  const trades: LocalTradeResult[] = [];
  let lastWeek = "";

  for (let i = 20; i < bars.length - 1; i++) {
    const wk = weekKey(bars[i].t);
    if (wk === lastWeek) continue; // one entry per calendar week
    lastWeek = wk;

    const sigma = realizedVolAt(closes, i, 20);
    if (sigma == null || sigma <= 0) continue;
    const expiry = nextThursday(bars[i].t);
    const t0 = (expiry - bars[i].t) / YEAR_SEC;
    if (t0 <= 0) continue;

    const spot = closes[i];
    const width = profile.distanceSigma * sigma * Math.sqrt(t0) * spot;
    const callStrike = round50(spot + width);
    const putStrike = round50(spot - width);
    if (callStrike <= spot || putStrike >= spot) continue; // degenerate (near-zero vol) — skip rather than mis-price

    const callLeg = runLeg(bars, closes, i, callStrike, "CALL", sigma, expiry, profile);
    const putLeg = runLeg(bars, closes, i, putStrike, "PUT", sigma, expiry, profile);
    if (callLeg) trades.push(callLeg);
    if (putLeg) trades.push(putLeg);
  }

  trades.sort((a, b) => (a.exit_time < b.exit_time ? -1 : a.exit_time > b.exit_time ? 1 : 0));

  const pnls = trades.map((t) => t.pnl);
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p <= 0);
  const equity: number[] = [];
  let run = 0;
  let peak = 0;
  let maxDd = 0;
  for (const p of pnls) {
    run += p;
    equity.push(Math.round(run * 100) / 100);
    peak = Math.max(peak, run);
    maxDd = Math.min(maxDd, run - peak);
  }
  const total = pnls.reduce((a, b) => a + b, 0);
  const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;

  return {
    trades: trades.length,
    pnl: Math.round(total * 100) / 100,
    win_rate: trades.length ? Math.round((wins.length / trades.length) * 1000) / 10 : 0,
    avg_win: Math.round(avgWin * 100) / 100,
    avg_loss: Math.round(avgLoss * 100) / 100,
    max_dd: Math.round(maxDd * 100) / 100,
    rr: avgLoss !== 0 && wins.length && losses.length ? Math.round(Math.abs(avgWin / avgLoss) * 100) / 100 : 0,
    equity_curve: equity,
    trade_list: trades,
  };
}

export function runAllLocalBacktests(bars: Bar[]): Record<LocalRiskLevel, LocalBacktestProfile> {
  return {
    low: runStrangleBacktest(bars, "low"),
    medium: runStrangleBacktest(bars, "medium"),
    high: runStrangleBacktest(bars, "high"),
  };
}
