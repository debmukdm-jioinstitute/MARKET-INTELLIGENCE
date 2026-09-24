import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";

/**
 * India Macro Stress Index — a transparent heuristic, not a fitted or backtested model.
 * Each input is mapped linearly onto 0–100 between a "calm" and a "stressed" level, then
 * combined with fixed weights (renormalised over the inputs that are available).
 * Inputs are grouped into independent signal FAMILIES; convergence = several families stressed at once.
 */

export type FamilyId = "volatility" | "currency" | "rates" | "liquidity" | "commodity" | "flows" | "price";

export type StressComponent = {
  id: string;
  family: FamilyId;
  label: string;
  display: string;
  score: number;
  weight: number;
};

export type FamilyState = { id: FamilyId; label: string; score: number; firing: boolean };

export type Convergence = {
  firing: FamilyId[];
  score: number;
  priority: "none" | "high" | "critical";
};

export type StressResult = {
  asOf: string;
  score: number | null;
  band: "calm" | "normal" | "elevated" | "high" | "extreme" | "unavailable";
  components: StressComponent[];
  families: FamilyState[];
  convergence: Convergence;
};

export const FAMILY_LABEL: Record<FamilyId, string> = {
  volatility: "Volatility",
  currency: "Currency",
  rates: "Rates & dollar",
  liquidity: "Rupee liquidity",
  commodity: "Commodities",
  flows: "Capital flows",
  price: "Price action",
};

/** A family "fires" when its weighted score reaches this level. */
export const FAMILY_FIRE_AT = 60;
/** Minimum share of total weight that must be observable before an index is published. */
const MIN_COVERAGE = 0.5;

export type Spec = {
  id: string;
  family: FamilyId;
  label: string;
  weight: number;
  calm: number;
  stressed: number;
  read: (d: IndiaDashboardPayload) => number | null;
  fmt: (v: number) => string;
};

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

export const SPECS: Spec[] = [
  { id: "india_vix", family: "volatility", label: "India VIX (level)", weight: 0.12, calm: 11, stressed: 28, read: (d) => d.pulse.indiaVix.value, fmt: (v) => v.toFixed(2) },
  { id: "india_vix_1d", family: "volatility", label: "India VIX 1-day jump", weight: 0.06, calm: 0, stressed: 0.25, read: (d) => d.pulse.indiaVix.changePct ?? null, fmt: pct },
  { id: "us_vix", family: "volatility", label: "US VIX (level)", weight: 0.14, calm: 12, stressed: 35, read: (d) => d.globalRadar.vix?.value ?? null, fmt: (v) => v.toFixed(2) },
  { id: "usdinr_1d", family: "currency", label: "USD/INR 1-day move (rupee weakness)", weight: 0.14, calm: 0, stressed: 0.008, read: (d) => d.pulse.usdInr.changePct ?? null, fmt: pct },
  // Absolute change in yield points (0.15 = 15bp); the feed's changePct for ^TNX is not reliable.
  { id: "us10y_1d", family: "rates", label: "US 10Y yield 1-day rise (bp)", weight: 0.09, calm: 0, stressed: 0.15, read: (d) => d.globalRadar.us10y?.change ?? null, fmt: (v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(0)}bp` },
  { id: "dxy_1d", family: "rates", label: "Dollar index 1-day rise", weight: 0.05, calm: 0, stressed: 0.01, read: (d) => d.globalRadar.dxy?.changePct ?? null, fmt: pct },
  // RBI net liquidity injected(+)/absorbed(−), ₹ cr: large surplus (−2 L Cr) = calm, injection of +1 L Cr (deficit) = stressed.
  { id: "rbi_liquidity", family: "liquidity", label: "RBI net liquidity (injection = deficit)", weight: 0.08, calm: -200000, stressed: 100000, read: (d) => d.rbiLiquidity.systemLiquidity.netCr ?? null, fmt: (v) => `${v < 0 ? "−" : "+"}₹${(Math.abs(v) / 100000).toFixed(2)} L Cr` },
  { id: "brent_1d", family: "commodity", label: "Brent 1-day rise (India is a net oil importer)", weight: 0.09, calm: 0, stressed: 0.04, read: (d) => d.pulse.brent.changePct ?? null, fmt: pct },
  { id: "fii_net", family: "flows", label: "FII net flow today (₹ cr; outflow = stress)", weight: 0.14, calm: 0, stressed: -4000, read: (d) => d.moneyFlow.fii.today, fmt: (v) => `${v >= 0 ? "+" : ""}${Math.round(v).toLocaleString("en-IN")}` },
  { id: "nifty_1d", family: "price", label: "NIFTY 1-day fall", weight: 0.12, calm: 0, stressed: -0.02, read: (d) => d.pulse.nifty.changePct ?? null, fmt: pct },
  {
    id: "breadth",
    family: "price",
    label: "Market breadth (share of decliners)",
    weight: 0.05,
    calm: 0.5,
    stressed: 0.8,
    read: (d) => {
      const { advances: a, declines: b } = d.pulse.breadth;
      return a != null && b != null && a + b > 0 ? b / (a + b) : null;
    },
    fmt: (v) => `${(v * 100).toFixed(0)}%`,
  },
];

/** Linear map calm→0, stressed→100, clamped; works for either direction (stressed < calm too). */
export function scoreLinear(v: number, calm: number, stressed: number): number {
  const t = (v - calm) / (stressed - calm);
  return Math.max(0, Math.min(100, t * 100));
}

export function bandFor(score: number): StressResult["band"] {
  if (score >= 80) return "extreme";
  if (score >= 65) return "high";
  if (score >= 45) return "elevated";
  if (score >= 25) return "normal";
  return "calm";
}

export function computeStress(d: IndiaDashboardPayload): StressResult {
  const observed = SPECS.flatMap((s) => {
    const v = s.read(d);
    return v == null || !Number.isFinite(v) ? [] : [{ s, v }];
  });
  const totalWeight = SPECS.reduce((a, s) => a + s.weight, 0);
  const seenWeight = observed.reduce((a, o) => a + o.s.weight, 0);

  const components: StressComponent[] = observed.map(({ s, v }) => ({
    id: s.id,
    family: s.family,
    label: s.label,
    display: s.fmt(v),
    score: scoreLinear(v, s.calm, s.stressed),
    weight: s.weight / seenWeight,
  }));

  const families: FamilyState[] = (Object.keys(FAMILY_LABEL) as FamilyId[]).flatMap((id) => {
    const cs = components.filter((c) => c.family === id);
    if (!cs.length) return [];
    const w = cs.reduce((a, c) => a + c.weight, 0);
    const score = cs.reduce((a, c) => a + c.score * c.weight, 0) / w;
    return [{ id, label: FAMILY_LABEL[id], score, firing: score >= FAMILY_FIRE_AT }];
  });

  const firing = families.filter((f) => f.firing).map((f) => f.id);
  const typeScore = firing.length * 25;
  const boost = Math.min(25, families.filter((f) => f.firing).reduce((a, f) => a + (f.score - FAMILY_FIRE_AT) / 4, 0));
  const convergence: Convergence = {
    firing,
    score: Math.min(100, Math.round(typeScore + boost)),
    priority: firing.length >= 4 ? "critical" : firing.length >= 3 ? "high" : "none",
  };

  const covered = seenWeight / totalWeight >= MIN_COVERAGE;
  const score = covered ? components.reduce((a, c) => a + c.score * c.weight, 0) : null;
  return {
    asOf: d.fetchedAt,
    score: score == null ? null : Math.round(score * 10) / 10,
    band: score == null ? "unavailable" : bandFor(score),
    components,
    families,
    convergence,
  };
}
