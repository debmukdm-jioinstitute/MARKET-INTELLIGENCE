/**
 * Valuation analytics layered on top of the model: scenarios, Monte Carlo,
 * reverse DCF, tornado, margin x growth grid, and the football-field summary.
 * Every function re-runs buildModel with shifted assumptions — no duplicated logic.
 */
import { buildModel } from "@/lib/models/dcf-engine";
import { normal, percentile, rng, median } from "@/lib/models/stats";
import type { Assumptions, FinancialDataset, ModelResult, ModelShift } from "@/lib/models/types";

const price = (ds: FinancialDataset, A: Assumptions, shift?: ModelShift) => buildModel(ds, A, shift).dcf.impliedPrice;

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

export type Scenario = { name: string; probability: number; shift: ModelShift; price: number; upside: number };
export type ScenarioResult = { scenarios: Scenario[]; expectedPrice: number; expectedUpside: number };

export const DEFAULT_SCENARIOS: { name: string; probability: number; shift: ModelShift }[] = [
  { name: "Bear", probability: 0.25, shift: { growth: -0.03, margin: -0.02, wacc: 0.0075, terminalGrowth: -0.005 } },
  { name: "Base", probability: 0.5, shift: {} },
  { name: "Bull", probability: 0.25, shift: { growth: 0.02, margin: 0.015, wacc: -0.005, terminalGrowth: 0.0025 } },
];

export function runScenarios(ds: FinancialDataset, A: Assumptions, defs = DEFAULT_SCENARIOS): ScenarioResult {
  const total = defs.reduce((s, d) => s + d.probability, 0) || 1;
  const cur = A.values.price as number;
  const scenarios = defs.map((d) => {
    const p = price(ds, A, d.shift);
    return { name: d.name, probability: d.probability / total, shift: d.shift, price: p, upside: p / cur - 1 };
  });
  const expectedPrice = scenarios.reduce((s, x) => s + x.probability * x.price, 0);
  return { scenarios, expectedPrice, expectedUpside: expectedPrice / cur - 1 };
}

// ---------------------------------------------------------------------------
// Monte Carlo
// ---------------------------------------------------------------------------

export type MonteCarloResult = {
  runs: number;
  p5: number; p10: number; p25: number; p50: number; p75: number; p90: number; p95: number;
  mean: number;
  probUpside: number; // share of draws with implied price above the current price
  histogram: { lo: number; hi: number; count: number }[];
};

/** Draws growth (pp/yr), margin (pp), WACC (pp) and terminal-growth (pp) shifts from independent normals. */
export function runMonteCarlo(
  ds: FinancialDataset,
  A: Assumptions,
  runs = 1500,
  seed = 42,
  sd = { growth: 0.02, margin: 0.015, wacc: 0.005, terminalGrowth: 0.0035 },
): MonteCarloResult {
  const u = rng(seed);
  const cur = A.values.price as number;
  const out: number[] = [];
  for (let i = 0; i < runs; i++) {
    const p = price(ds, A, {
      growth: normal(u) * sd.growth,
      margin: normal(u) * sd.margin,
      wacc: normal(u) * sd.wacc,
      terminalGrowth: normal(u) * sd.terminalGrowth,
    });
    if (Number.isFinite(p)) out.push(p);
  }
  out.sort((a, b) => a - b);
  const mean = out.reduce((s, v) => s + v, 0) / (out.length || 1);
  const lo = percentile(out, 0.01);
  const hi = percentile(out, 0.99);
  const bins = 24;
  const w = (hi - lo) / bins || 1;
  const histogram = Array.from({ length: bins }, (_, b) => ({ lo: lo + b * w, hi: lo + (b + 1) * w, count: 0 }));
  for (const v of out) {
    const b = Math.min(bins - 1, Math.max(0, Math.floor((v - lo) / w)));
    histogram[b].count++;
  }
  return {
    runs: out.length,
    p5: percentile(out, 0.05), p10: percentile(out, 0.1), p25: percentile(out, 0.25), p50: percentile(out, 0.5),
    p75: percentile(out, 0.75), p90: percentile(out, 0.9), p95: percentile(out, 0.95),
    mean,
    probUpside: out.filter((v) => v > cur).length / (out.length || 1),
    histogram,
  };
}

// ---------------------------------------------------------------------------
// Reverse DCF
// ---------------------------------------------------------------------------

export type ReverseDcfResult = {
  targetPrice: number;
  growthShift: number | null; // additive pp per year to every forecast year's revenue growth
  impliedAvgGrowth: number | null;
  baseAvgGrowth: number;
  marginShift: number | null;
  impliedEbitMargin: number | null;
  baseEbitMargin: number;
  converged: boolean;
};

function bisect(f: (x: number) => number, target: number, lo: number, hi: number): number | null {
  const flo = f(lo) - target;
  const fhi = f(hi) - target;
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null;
  let a = lo, b = hi;
  for (let i = 0; i < 60; i++) {
    const mid = (a + b) / 2;
    const fm = f(mid) - target;
    if (Math.abs(fm) < 1e-6) return mid;
    if (fm * flo > 0) a = mid; else b = mid;
  }
  return (a + b) / 2;
}

/** What growth (or margin) does today's market price imply, holding everything else at the base case? */
export function reverseDcf(ds: FinancialDataset, A: Assumptions): ReverseDcfResult {
  const target = A.values.price as number;
  const base = buildModel(ds, A);
  const growthVec = A.values.rev_growth as number[];
  const baseAvgGrowth = growthVec.reduce((s, v) => s + v, 0) / growthVec.length;
  const lastProj = base.dcf.years[base.dcf.years.length - 1];
  const baseEbitMargin = lastProj.ebit / lastProj.revenue;

  const gs = bisect((x) => price(ds, A, { growth: x }), target, -0.3, 0.5);
  const ms = bisect((x) => price(ds, A, { margin: x }), target, -0.3, 0.3);
  return {
    targetPrice: target,
    growthShift: gs,
    impliedAvgGrowth: gs == null ? null : baseAvgGrowth + gs,
    baseAvgGrowth,
    marginShift: ms,
    impliedEbitMargin: ms == null ? null : baseEbitMargin + ms,
    baseEbitMargin,
    converged: gs != null || ms != null,
  };
}

// ---------------------------------------------------------------------------
// Tornado + margin x growth grid
// ---------------------------------------------------------------------------

export type TornadoBar = { label: string; low: number; high: number; lowLabel: string; highLabel: string };

export function runTornado(ds: FinancialDataset, A: Assumptions): { basePrice: number; bars: TornadoBar[] } {
  const basePrice = price(ds, A);
  const scaleVec = (key: string, f: number) => ({ ...A, values: { ...A.values, [key]: (A.values[key] as number[]).map((x) => x * f) } });
  const scaleSca = (key: string, f: number) => ({ ...A, values: { ...A.values, [key]: (A.values[key] as number) * f } });
  const setSca = (key: string, v: number) => ({ ...A, values: { ...A.values, [key]: v } });

  const defs: { label: string; lowLabel: string; highLabel: string; low: () => number; high: () => number }[] = [
    { label: "Revenue growth", lowLabel: "-2pp / yr", highLabel: "+2pp / yr", low: () => price(ds, A, { growth: -0.02 }), high: () => price(ds, A, { growth: 0.02 }) },
    { label: "EBIT margin", lowLabel: "-2pp", highLabel: "+2pp", low: () => price(ds, A, { margin: -0.02 }), high: () => price(ds, A, { margin: 0.02 }) },
    { label: "WACC", lowLabel: "+1pp", highLabel: "-1pp", low: () => price(ds, A, { wacc: 0.01 }), high: () => price(ds, A, { wacc: -0.01 }) },
    { label: "Terminal growth", lowLabel: "-0.5pp", highLabel: "+0.5pp", low: () => price(ds, A, { terminalGrowth: -0.005 }), high: () => price(ds, A, { terminalGrowth: 0.005 }) },
    {
      label: "Capex intensity", lowLabel: "+10%", highLabel: "-10%",
      low: () => price(ds, (A.values.capex_mode as number) === 1 ? scaleSca("ppe_to_revenue", 1.1) : scaleVec("capex_pct", 1.1)),
      high: () => price(ds, (A.values.capex_mode as number) === 1 ? scaleSca("ppe_to_revenue", 0.9) : scaleVec("capex_pct", 0.9)),
    },
    { label: "Terminal tax rate", lowLabel: "+3pp", highLabel: "-3pp", low: () => price(ds, setSca("terminal_tax_rate", (A.values.terminal_tax_rate as number) + 0.03)), high: () => price(ds, setSca("terminal_tax_rate", (A.values.terminal_tax_rate as number) - 0.03)) },
    { label: "Terminal ROIC spread", lowLabel: "-1pp", highLabel: "+1pp", low: () => price(ds, setSca("terminal_roic_spread", (A.values.terminal_roic_spread as number) - 0.01)), high: () => price(ds, setSca("terminal_roic_spread", (A.values.terminal_roic_spread as number) + 0.01)) },
    { label: "Working-capital days", lowLabel: "+10%", highLabel: "-10%", low: () => price(ds, scaleSca("dso", 1.1)), high: () => price(ds, scaleSca("dso", 0.9)) },
  ];
  const bars = defs
    .map((d) => ({ label: d.label, low: d.low(), high: d.high(), lowLabel: d.lowLabel, highLabel: d.highLabel }))
    .sort((a, b) => Math.abs(b.high - b.low) - Math.abs(a.high - a.low));
  return { basePrice, bars };
}

export type GrowthMarginGrid = { growthShifts: number[]; marginShifts: number[]; grid: number[][]; basePrice: number };

/** Implied price across a revenue-growth shift (columns) x EBIT-margin shift (rows) grid. */
export function growthMarginGrid(ds: FinancialDataset, A: Assumptions): GrowthMarginGrid {
  const growthShifts = [-0.04, -0.02, 0, 0.02, 0.04];
  const marginShifts = [-0.04, -0.02, 0, 0.02, 0.04];
  return {
    growthShifts,
    marginShifts,
    grid: marginShifts.map((m) => growthShifts.map((g) => price(ds, A, { growth: g, margin: m }))),
    basePrice: price(ds, A),
  };
}

// ---------------------------------------------------------------------------
// Football field (DCF vs comps vs market range)
// ---------------------------------------------------------------------------

export type FootballBar = { label: string; low: number; mid: number; high: number; note?: string };

export function footballField(model: ModelResult, scen: ScenarioResult, mc: MonteCarloResult | null): FootballBar[] {
  const { dataset, assumptions: A, dcf } = model;
  const bars: FootballBar[] = [];
  const bear = scen.scenarios.find((s) => s.name === "Bear")?.price;
  const bull = scen.scenarios.find((s) => s.name === "Bull")?.price;
  if (bear != null && bull != null) bars.push({ label: model.method === "fcff" ? "DCF (bear – bull)" : "Residual income (bear – bull)", low: Math.min(bear, bull), mid: dcf.impliedPrice, high: Math.max(bear, bull) });
  if (mc) bars.push({ label: "Monte Carlo (P10 – P90)", low: mc.p10, mid: mc.p50, high: mc.p90, note: `${mc.runs} draws` });

  const mDil = dcf.dilution.dilutedShares;
  const peers = dataset.peers;
  if (peers && model.method === "fcff") {
    const rows = dataset.periods;
    const L = rows.length - 1;
    const ebitda = dataset.ttm?.ebitda != null ? dataset.ttm.ebitda / 1e6 : ((Number(rows[L].fields.operating_income) || 0) + (Number(rows[L].fields.da) || Number(rows[L].fields.da_cf) || 0)) / 1e6;
    const evToEq = dcf.bridge.equityValue - dcf.bridge.enterpriseValue;
    const evs = peers.peers.map((p) => p.evEbitda).filter((v): v is number => v != null && v > 0 && v < 80);
    if (evs.length >= 3 && ebitda > 0) {
      const sorted = [...evs].sort((a, b) => a - b);
      const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.round(p * (sorted.length - 1)))];
      const px = (m: number) => (m * ebitda + evToEq) / mDil;
      bars.push({ label: "Peer EV/EBITDA (25th – 75th pct)", low: px(q(0.25)), mid: px(median(sorted)!), high: px(q(0.75)), note: `${evs.length} peers, median ${median(sorted)!.toFixed(1)}x` });
    }
  }
  if (peers) {
    const ni = dataset.ttm?.net_income != null ? dataset.ttm.net_income / 1e6 : (Number(dataset.periods[dataset.periods.length - 1].fields.net_income) || 0) / 1e6;
    const pes = peers.peers.map((p) => p.pe).filter((v): v is number => v != null && v > 0 && v < 200).sort((a, b) => a - b);
    if (pes.length >= 3 && ni > 0) {
      const q = (p: number) => pes[Math.min(pes.length - 1, Math.round(p * (pes.length - 1)))];
      bars.push({ label: "Peer P/E (25th – 75th pct)", low: (q(0.25) * ni) / mDil, mid: (median(pes)! * ni) / mDil, high: (q(0.75) * ni) / mDil, note: `${pes.length} peers, median ${median(pes)!.toFixed(1)}x` });
    }
    const bv = (Number(dataset.periods[dataset.periods.length - 1].fields.stockholders_equity) || 0) / 1e6;
    const pbs = peers.peers.map((p) => p.pb).filter((v): v is number => v != null && v > 0 && v < 60).sort((a, b) => a - b);
    // P/B is only meaningful when book equity is a real share of market value (buyback-hollowed balance sheets make it noise)
    const bookShare = bv / ((A.values.price as number) * (A.values.shares_outstanding as number) || 1);
    if (pbs.length >= 3 && bv > 0 && bookShare > 0.05) {
      const q = (p: number) => pbs[Math.min(pbs.length - 1, Math.round(p * (pbs.length - 1)))];
      bars.push({ label: "Peer P/B (25th – 75th pct)", low: (q(0.25) * bv) / mDil, mid: (median(pbs)! * bv) / mDil, high: (q(0.75) * bv) / mDil, note: `${pbs.length} peers, median ${median(pbs)!.toFixed(1)}x` });
    }
  }
  const { fiftyTwoWeekLow: lo, fiftyTwoWeekHigh: hi } = dataset.market;
  if (lo != null && hi != null) bars.push({ label: "52-week trading range", low: lo, mid: A.values.price as number, high: hi });
  return bars;
}
