import { bsmPrice } from "./black-scholes";
import type { StrategyLeg } from "./strategy-recommender";

export type HeatmapPoint = { price_sim: number; t_days: number; pnl: number };

export function generateHeatmapGrid(opts: {
  spot: number;
  legs: StrategyLeg[];
  daysToSimulate: number;
  volatilityShock: number;
  lotSize: number;
  riskFreeRate?: number;
}): { grid: HeatmapPoint[]; max_profit: number; max_loss: number } {
  const { spot, legs, daysToSimulate, volatilityShock, lotSize, riskFreeRate = 0.065 } = opts;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let initialCost = 0;
  for (const leg of legs) {
    const cost = leg.premium * leg.qty * lotSize;
    if (leg.action === "buy") initialCost -= cost;
    else initialCost += cost;
  }

  const critical = [spot, ...legs.map((l) => l.strike)];
  const minP = Math.min(...critical) * 0.85;
  const maxP = Math.max(...critical) * 1.15;
  const priceSteps: number[] = [];
  for (let i = 0; i <= 48; i++) priceSteps.push(minP + ((maxP - minP) * i) / 48);

  const timeSteps =
    daysToSimulate > 0
      ? [0, Math.floor(daysToSimulate / 4), Math.floor(daysToSimulate / 2), Math.floor((3 * daysToSimulate) / 4), daysToSimulate]
      : [0];

  const grid: HeatmapPoint[] = [];
  let maxProfit = Number.NEGATIVE_INFINITY;
  let minPnl = Number.POSITIVE_INFINITY;

  for (const tDays of timeSteps) {
    for (const simPrice of priceSteps) {
      let totalValue = 0;
      for (const leg of legs) {
        const exp = new Date(leg.expiration);
        const daysRemaining = Math.max(0, Math.round((exp.getTime() - today.getTime()) / 86_400_000) - tDays);
        const T = daysRemaining / 365.25;
        const sigma = Math.max(0.22 + volatilityShock, 0.05);
        const simLeg = bsmPrice(simPrice, leg.strike, T, riskFreeRate, sigma, leg.type);
        const mult = leg.qty * lotSize;
        if (leg.action === "buy") totalValue += simLeg * mult;
        else totalValue -= simLeg * mult;
      }
      const pnl = totalValue + initialCost;
      grid.push({ price_sim: Math.round(simPrice * 100) / 100, t_days: tDays, pnl: Math.round(pnl * 100) / 100 });
      maxProfit = Math.max(maxProfit, pnl);
      minPnl = Math.min(minPnl, pnl);
    }
  }

  return { grid, max_profit: maxProfit, max_loss: minPnl };
}
