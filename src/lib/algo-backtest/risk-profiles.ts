/**
 * LOW / MEDIUM / HIGH parameters for the local, no-proxy strangle backtest. Lot size mirrors the
 * real production defaults in services/ai-trader/config/risk_profiles.py (base_lot_size=65 for
 * every tier — that system varies selectivity and capital fraction, not lot count, and this one
 * follows the same convention). Strike distance is expressed in standard deviations of the
 * index's own trailing realized volatility (see option-pricing.ts) rather than a fixed percent,
 * so it adapts to the actual vol regime at entry instead of one width fitted to one period.
 */

export type LocalRiskLevel = "low" | "medium" | "high";

export type LocalRiskProfile = {
  name: string;
  base_lot_size: number;
  lot_multiplier: number;
  /** OTM strike distance = distanceSigma * sigma_annual * sqrt(T) on each side (wider = safer, less premium). */
  distanceSigma: number;
  /** Stop-loss as a fraction of the credit received (1.0 = exit if the position is down the full credit). */
  sl_pct: number;
  /** Profit target as a fraction of the credit received. */
  tgt_pct: number;
  score_threshold: number;
  max_trades_day: number;
  max_premium: number;
  max_capital_per_trade: number;
};

export const LOCAL_RISK_PROFILES: Record<LocalRiskLevel, LocalRiskProfile> = {
  low: {
    name: "Conservative",
    base_lot_size: 65,
    lot_multiplier: 1.0,
    distanceSigma: 1.5,
    sl_pct: 1.0,
    tgt_pct: 0.5,
    score_threshold: 0.7,
    max_trades_day: 3,
    max_premium: 200,
    max_capital_per_trade: 0.008,
  },
  medium: {
    name: "Balanced",
    base_lot_size: 65,
    lot_multiplier: 1.0,
    distanceSigma: 1.1,
    sl_pct: 1.0,
    tgt_pct: 0.55,
    score_threshold: 0.6,
    max_trades_day: 5,
    max_premium: 250,
    max_capital_per_trade: 0.01,
  },
  high: {
    name: "Aggressive",
    base_lot_size: 65,
    lot_multiplier: 1.0,
    distanceSigma: 0.8,
    sl_pct: 1.0,
    tgt_pct: 0.55,
    score_threshold: 0.6,
    max_trades_day: 5,
    max_premium: 250,
    max_capital_per_trade: 0.012,
  },
};
