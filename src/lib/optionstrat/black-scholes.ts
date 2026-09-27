/** Black–Scholes–Merton (European). Ported from EconomiaUNMSM/OptionStrat-AI (MIT-style academic use). */

function normCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x));
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp((-x * x) / 2));
  return 0.5 * (1 + sign * y);
}

export function bsmPrice(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  kind: "call" | "put",
  q = 0,
): number {
  if (T <= 0 || sigma <= 0) return Math.max(0, kind === "call" ? S - K : K - S);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  if (kind === "call") return S * Math.exp(-q * T) * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
  return K * Math.exp(-r * T) * normCdf(-d2) - S * Math.exp(-q * T) * normCdf(-d1);
}
