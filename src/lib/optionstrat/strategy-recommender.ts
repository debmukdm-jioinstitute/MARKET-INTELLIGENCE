/**
 * Theta-style strategy builder — logic adapted from EconomiaUNMSM/OptionStrat-AI
 * (https://github.com/EconomiaUNMSM/OptionStrat-AI).
 */

export type ChainRow = {
  strike: number;
  optionType: "call" | "put";
  expiration: string;
  bid: number;
  ask: number;
  lastPrice: number;
  mid_price?: number;
  delta: number;
  volume: number;
  openInterest: number;
  iv: number;
};

export type StrategyLeg = {
  strike: number;
  type: "call" | "put";
  action: "buy" | "sell";
  premium: number;
  qty: number;
  expiration: string;
  volume: number;
  open_interest: number;
};

export type StrategyRecommendation = {
  name: string;
  type: string;
  sentiment: string;
  legs: StrategyLeg[];
  metrics: {
    net_premium: number;
    max_loss: number | "Unlimited";
    margin_req: number;
    roc_percent: number;
  };
};

export type RiskProfile = "conservative" | "balanced" | "aggressive";
export type MarketBias = "bullish" | "neutral" | "bearish";

function getRiskParams(profile: RiskProfile, wingWidth: number) {
  if (profile === "conservative") return { sell_delta: 0.15, wing_width: wingWidth };
  if (profile === "aggressive") return { sell_delta: 0.3, wing_width: wingWidth * 1.5 };
  return { sell_delta: 0.2, wing_width: wingWidth };
}

function findClosestDelta(rows: ChainRow[], targetDelta: number): ChainRow | null {
  if (!rows.length) return null;
  let best = rows[0];
  let bestDiff = Math.abs(Math.abs(best.delta) - targetDelta);
  for (const r of rows) {
    const d = Math.abs(Math.abs(r.delta) - targetDelta);
    if (d < bestDiff) {
      bestDiff = d;
      best = r;
    }
  }
  return best;
}

function findClosestStrike(rows: ChainRow[], target: number): ChainRow | null {
  if (!rows.length) return null;
  let best = rows[0];
  let bestDiff = Math.abs(best.strike - target);
  for (const r of rows) {
    const d = Math.abs(r.strike - target);
    if (d < bestDiff) {
      bestDiff = d;
      best = r;
    }
  }
  return best;
}

function formatLeg(row: ChainRow, action: "buy" | "sell"): StrategyLeg {
  let premium = row.mid_price ?? 0;
  if (premium <= 0) premium = row.lastPrice;
  if (premium <= 0 && (row.bid > 0 || row.ask > 0)) premium = (row.bid + row.ask) / 2;
  if (premium <= 0) premium = 0.01;
  return {
    strike: row.strike,
    type: row.optionType,
    action,
    premium,
    qty: 1,
    expiration: row.expiration,
    volume: row.volume,
    open_interest: row.openInterest,
  };
}

function validateStrategy(strategy: Omit<StrategyRecommendation, "metrics">, spot: number, lotSize: number): StrategyRecommendation {
  const legs = strategy.legs;
  let totalCredit = 0;
  for (const leg of legs) {
    const cost = leg.premium * leg.qty * lotSize;
    if (leg.action === "sell") totalCredit += cost;
    else totalCredit -= cost;
  }

  const sellLegs = legs.filter((l) => l.action === "sell");
  const buyLegs = legs.filter((l) => l.action === "buy");
  let maxLoss: number | "Unlimited" = 0;
  let buyingPower = 0;

  if (legs.length === 4 && sellLegs.length === 2 && buyLegs.length === 2) {
    const putStrikes = legs.filter((l) => l.type === "put").map((l) => l.strike);
    const callStrikes = legs.filter((l) => l.type === "call").map((l) => l.strike);
    const putWidth = Math.abs(putStrikes[0] - putStrikes[1]) * lotSize;
    const callWidth = Math.abs(callStrikes[0] - callStrikes[1]) * lotSize;
    const wider = Math.max(putWidth, callWidth);
    maxLoss = wider - totalCredit;
    buyingPower = maxLoss;
  } else if (legs.length === 2 && sellLegs.length === 1 && buyLegs.length === 1) {
    const width = Math.abs(legs[0].strike - legs[1].strike) * lotSize;
    maxLoss = width - totalCredit;
    buyingPower = maxLoss;
  } else if (legs.length === 2 && sellLegs.length === 2) {
    maxLoss = "Unlimited";
    buyingPower = spot * 0.2 * lotSize;
  }

  const roc =
    buyingPower > 0 && typeof maxLoss === "number" && maxLoss > 0 ? (totalCredit / buyingPower) * 100 : 0;

  return {
    ...strategy,
    metrics: {
      net_premium: Math.round(totalCredit * 100) / 100,
      max_loss: maxLoss === "Unlimited" ? "Unlimited" : Math.round(maxLoss * 100) / 100,
      margin_req: Math.round(buyingPower * 100) / 100,
      roc_percent: Math.round(roc * 100) / 100,
    },
  };
}

function bullPutSpread(chain: ChainRow[], spot: number, profile: RiskProfile, wingWidth: number) {
  const risk = getRiskParams(profile, wingWidth);
  const puts = chain.filter((r) => r.optionType === "put" && r.strike < spot);
  const shortPut = findClosestDelta(puts, risk.sell_delta);
  if (!shortPut) return null;
  const longPuts = puts.filter((r) => r.strike < shortPut.strike);
  const longPut = findClosestStrike(longPuts, shortPut.strike - risk.wing_width);
  if (!longPut) return null;
  return {
    name: "Bull Put Spread",
    type: "bull_put_spread",
    sentiment: "bullish",
    legs: [formatLeg(shortPut, "sell"), formatLeg(longPut, "buy")],
  };
}

function bearCallSpread(chain: ChainRow[], spot: number, profile: RiskProfile, wingWidth: number, forcedWidth?: number) {
  const risk = getRiskParams(profile, wingWidth);
  const width = forcedWidth ?? risk.wing_width;
  const calls = chain.filter((r) => r.optionType === "call" && r.strike > spot);
  const shortCall = findClosestDelta(calls, risk.sell_delta);
  if (!shortCall) return null;
  const longCalls = calls.filter((r) => r.strike > shortCall.strike);
  const longCall = findClosestStrike(longCalls, shortCall.strike + width);
  if (!longCall) return null;
  return {
    name: "Bear Call Spread",
    type: "bear_call_spread",
    sentiment: "bearish",
    legs: [formatLeg(shortCall, "sell"), formatLeg(longCall, "buy")],
  };
}

function ironCondor(chain: ChainRow[], spot: number, profile: RiskProfile, wingWidth: number) {
  const bull = bullPutSpread(chain, spot, profile, wingWidth);
  if (!bull) return null;
  const putWidth = Math.abs(bull.legs[0].strike - bull.legs[1].strike);
  const bear = bearCallSpread(chain, spot, profile, wingWidth, putWidth);
  if (!bear) return null;
  return {
    name: "Iron Condor",
    type: "iron_condor",
    sentiment: "neutral",
    legs: [...bull.legs, ...bear.legs],
  };
}

function shortStrangle(chain: ChainRow[], spot: number, profile: RiskProfile, wingWidth: number) {
  const risk = getRiskParams(profile, wingWidth);
  const puts = chain.filter((r) => r.optionType === "put" && r.strike < spot);
  const calls = chain.filter((r) => r.optionType === "call" && r.strike > spot);
  const shortPut = findClosestDelta(puts, risk.sell_delta);
  const shortCall = findClosestDelta(calls, risk.sell_delta);
  if (!shortPut || !shortCall) return null;
  return {
    name: "Short Strangle",
    type: "short_strangle",
    sentiment: "neutral",
    legs: [formatLeg(shortPut, "sell"), formatLeg(shortCall, "sell")],
  };
}

export function recommendStrategies(
  chain: ChainRow[],
  spot: number,
  bias: MarketBias,
  riskProfile: RiskProfile,
  wingWidth: number,
  lotSize: number,
): StrategyRecommendation[] {
  const candidates: Omit<StrategyRecommendation, "metrics">[] = [];

  if (bias === "bullish") {
    const s = bullPutSpread(chain, spot, riskProfile, wingWidth);
    if (s) candidates.push(s);
  } else if (bias === "bearish") {
    const s = bearCallSpread(chain, spot, riskProfile, wingWidth);
    if (s) candidates.push(s);
  } else {
    const ic = ironCondor(chain, spot, riskProfile, wingWidth);
    if (ic) candidates.push(ic);
    if (riskProfile === "aggressive" || !ic) {
      const st = shortStrangle(chain, spot, riskProfile, wingWidth);
      if (st) candidates.push(st);
    }
    if (!candidates.length) {
      const b = bullPutSpread(chain, spot, riskProfile, wingWidth);
      const be = bearCallSpread(chain, spot, riskProfile, wingWidth);
      if (b) candidates.push(b);
      if (be) candidates.push(be);
    }
  }

  const validated = candidates.map((c) => validateStrategy(c, spot, lotSize));
  return validated
    .filter((c) => c.metrics.net_premium >= 0)
    .sort((a, b) => b.metrics.roc_percent - a.metrics.roc_percent);
}
