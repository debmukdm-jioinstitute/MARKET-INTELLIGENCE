import type { BetaPayload, FactorId } from "./betas";

/** Shocks in natural units: brent/usdinr/spx are % moves, us10y_bp is basis points. */
export type Shocks = Partial<Record<"brent" | "usdinr" | "us10y_bp" | "spx", number>>;

export const SHOCK_BOUNDS = { brent: [-60, 100], usdinr: [-15, 25], us10y_bp: [-200, 300], spx: [-50, 40] } as const;

const toFactorUnits = (s: Shocks): Record<FactorId, number> => ({
  brent: s.brent ?? 0,
  usdinr: s.usdinr ?? 0,
  us10y: (s.us10y_bp ?? 0) / 10, // betas are per +10bp
  spx: s.spx ?? 0,
});

export type SectorImpact = {
  id: string;
  label: string;
  impactPct: number;
  /** Approximate 1-sd parameter uncertainty (ignores covariance between betas). */
  seApproxPct: number;
  contributions: Record<FactorId, number>;
  r2: number;
};

export function applyShocks(b: BetaPayload, shocks: Shocks): SectorImpact[] {
  const f = toFactorUnits(shocks);
  return b.sectors
    .map((s) => {
      const contributions = {} as Record<FactorId, number>;
      let total = 0;
      let varSum = 0;
      for (const fac of b.factors) {
        const c = s.betas[fac.id].beta * f[fac.id];
        contributions[fac.id] = c;
        total += c;
        varSum += (s.betas[fac.id].se * f[fac.id]) ** 2;
      }
      return { id: s.id, label: s.label, impactPct: total, seApproxPct: Math.sqrt(varSum), contributions, r2: s.r2 };
    })
    .sort((a, b2) => a.impactPct - b2.impactPct);
}

export const PRESETS: { id: string; label: string; note: string; shocks: Shocks }[] = [
  { id: "oil_spike", label: "Oil shock: Brent +20%", note: "Supply disruption pushes crude up.", shocks: { brent: 20 } },
  { id: "oil_crash", label: "Oil slump: Brent −20%", note: "Demand shock pulls crude down.", shocks: { brent: -20 } },
  { id: "rupee_slide", label: "Rupee slide: USD/INR +5%", note: "Sharp INR depreciation.", shocks: { usdinr: 5 } },
  { id: "us_yield_jump", label: "US yields +50bp", note: "Rates repricing higher.", shocks: { us10y_bp: 50 } },
  { id: "global_selloff", label: "Global sell-off: S&P −10%", note: "Risk-off in US equities.", shocks: { spx: -10 } },
  { id: "stagflation", label: "Stagflation combo", note: "Brent +25%, USD/INR +4%, US10Y +40bp, S&P −8%.", shocks: { brent: 25, usdinr: 4, us10y_bp: 40, spx: -8 } },
];
