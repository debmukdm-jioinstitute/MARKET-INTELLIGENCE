import { covariance, stdev } from "@/lib/analytics";
import { getReturns } from "@/lib/market";
import { getInstrument } from "@/lib/universe";

export type OptimizeGoal = "maxSharpe" | "minVol" | "riskParity";

export function optimizeWeights(symbols: string[], goal: OptimizeGoal) {
  if (symbols.length === 0) {
    return {
      weights: [],
      stats: { vol: 0, ret: 0, sharpe: 0 },
    };
  }

  const rets = symbols.map((symbol) => getReturns(symbol));
  const n = symbols.length;
  let weights = Array.from({ length: n }, () => 1 / n);
  const mu = rets.map((r) => (r.length > 0 ? r.reduce((a, b) => a + b, 0) / r.length : 0));
  const cov = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => covariance(rets[i]!, rets[j]!)),
  );

  const lr = 0.35;
  for (let iter = 0; iter < 220; iter += 1) {
    const portRet = weights.reduce((s, w, i) => s + w * mu[i]!, 0);
    const portVar = variance(weights, cov);
    const grad = weights.map((_, i) => {
      let dVar = 0;
      for (let j = 0; j < n; j += 1) dVar += 2 * cov[i]![j]! * weights[j]!;
      if (goal === "minVol") return dVar;
      if (goal === "maxSharpe") return -(mu[i]! / Math.max(Math.sqrt(portVar), 1e-8) - portRet * dVar / (2 * Math.max(portVar ** 1.5, 1e-8)));
      const rc = weights[i]! * dVar * 0.5;
      const target = portVar / n;
      return rc - target;
    });
    weights = weights.map((w, i) => Math.max(0.01, w - lr * grad[i]!));
    const sum = weights.reduce((a, b) => a + b, 0);
    weights = weights.map((w) => (sum > 0 ? w / sum : 1 / n));
  }

  const portR = mixReturns(rets, weights);
  const rf = 0.045 / 252;
  const sharpeVal = portR.length > 0 ? ((mean(portR) - rf) / Math.max(stdev(portR), 1e-12)) * Math.sqrt(252) : 0;
  return {
    weights: symbols.map((symbol, i) => ({
      symbol,
      name: getInstrument(symbol).name,
      weight: weights[i]!,
    })),
    stats: {
      vol: portR.length > 0 ? stdev(portR) * Math.sqrt(252) : 0,
      ret: portR.length > 0 ? (portR.reduce((a, b) => a + b, 0) / portR.length) * 252 : 0,
      sharpe: Number.isFinite(sharpeVal) ? sharpeVal : 0,
    },
  };
}

function mean(values: number[]) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function variance(w: number[], cov: number[][]) {
  let v = 0;
  for (let i = 0; i < w.length; i += 1) {
    for (let j = 0; j < w.length; j += 1) v += w[i]! * w[j]! * cov[i]![j]!;
  }
  return v;
}

function mixReturns(rets: number[][], weights: number[]) {
  const n = Math.min(...rets.map((r) => r.length));
  return Array.from({ length: n }, (_, t) =>
    weights.reduce((sum, w, i) => sum + w * rets[i]![t]!, 0),
  );
}
