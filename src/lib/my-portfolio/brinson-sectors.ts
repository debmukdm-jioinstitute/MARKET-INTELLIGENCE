import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import { weightsFor } from "@/lib/my-portfolio/benchmarks";
import type { BrinsonSectorRow, PortfolioSettings, PositionRow } from "@/lib/my-portfolio/types";
import { getInstrument } from "@/lib/universe";

const INDIA_SECTOR_BY_SYMBOL = Object.fromEntries(
  INDIA_EQUITIES.map((e) => [e.symbol.toUpperCase(), normalizeSectorLabel(e.sector)]),
);

/** Map broker/NSE sector strings into Brinson buckets (aligned with portfolio cards). */
export function normalizeSectorLabel(raw: string | null | undefined, symbol?: string): string {
  if (symbol && INDIA_SECTOR_BY_SYMBOL[symbol.toUpperCase()]) {
    return INDIA_SECTOR_BY_SYMBOL[symbol.toUpperCase()]!;
  }
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return symbol ? normalizeSectorLabel(null, symbol) : "Unclassified";
  if (s.includes("tech") || s.includes("it") || s.includes("software")) return "Technology";
  if (s.includes("bank") || s.includes("fin")) return "Financials";
  if (s.includes("energy") || s.includes("oil")) return "Energy";
  if (s.includes("health") || s.includes("pharma")) return "Healthcare";
  if (s.includes("fmcg") || s.includes("consumer") || s.includes("auto")) return "Consumer";
  if (s.includes("telecom") || s.includes("comm") || s.includes("media")) return "Communication";
  if (s.includes("metal") || s.includes("material")) return "Materials";
  if (s.includes("util") || s.includes("power")) return "Utilities";
  if (s.includes("estate") || s.includes("realty")) return "Real Estate";
  if (s.includes("infra") || s.includes("industrial")) return "Industrials";
  const inst = symbol ? getInstrument(symbol) : undefined;
  if (inst?.sector && inst.sector !== "Multi-Asset") return inst.sector;
  return "Unclassified";
}

function sectorForPosition(p: PositionRow): string {
  return normalizeSectorLabel(p.sector, p.symbol);
}

function aggregateBenchmarkSectorWeights(benchmark: PortfolioSettings["benchmark"]): Map<string, number> {
  const stock = weightsFor(benchmark);
  const map = new Map<string, number>();
  let sum = 0;
  for (const [sym, w] of Object.entries(stock)) {
    if (w <= 0) continue;
    const sector = normalizeSectorLabel(null, sym);
    map.set(sector, (map.get(sector) ?? 0) + w);
    sum += w;
  }
  if (sum > 0 && Math.abs(sum - 1) > 0.05) {
    for (const [k, v] of map) map.set(k, v / sum);
  }
  return map;
}

function weightedSectorReturn(
  symbols: { sym: string; weight: number }[],
  returns: Map<string, number>,
  fallback: number,
): number {
  let wSum = 0;
  let rSum = 0;
  for (const { sym, weight } of symbols) {
    const r = returns.get(sym.toUpperCase());
    if (r == null || !Number.isFinite(r)) continue;
    wSum += weight;
    rSum += weight * r;
  }
  if (wSum > 1e-9) return rSum / wSum;
  return fallback;
}

/**
 * Brinson-Fachler (single-period): allocation (w_p−w_b)×R_b, selection w_p×(R_p−R_b), interaction (w_p−w_b)×(R_p−R_b).
 */
export function computeBrinsonSectorAttribution(input: {
  positions: PositionRow[];
  symbolReturns: Map<string, number>;
  benchmark: PortfolioSettings["benchmark"];
  benchmarkReturn: number;
}): BrinsonSectorRow[] {
  const { positions, symbolReturns, benchmark, benchmarkReturn } = input;
  const benchStock = weightsFor(benchmark);
  const wBenchSector = aggregateBenchmarkSectorWeights(benchmark);

  const wPortSector = new Map<string, number>();
  const portSymbolsBySector = new Map<string, { sym: string; weight: number }[]>();
  for (const p of positions) {
    const sector = sectorForPosition(p);
    wPortSector.set(sector, (wPortSector.get(sector) ?? 0) + p.weight);
    const list = portSymbolsBySector.get(sector) ?? [];
    list.push({ sym: p.symbol, weight: p.weight });
    portSymbolsBySector.set(sector, list);
  }

  const benchSymbolsBySector = new Map<string, { sym: string; weight: number }[]>();
  for (const [sym, w] of Object.entries(benchStock)) {
    if (w <= 0) continue;
    const sector = normalizeSectorLabel(null, sym);
    const list = benchSymbolsBySector.get(sector) ?? [];
    list.push({ sym, weight: w });
    benchSymbolsBySector.set(sector, list);
  }

  const sectors = new Set([...wPortSector.keys(), ...wBenchSector.keys()]);
  const rows: BrinsonSectorRow[] = [];

  for (const sector of sectors) {
    const w_p = wPortSector.get(sector) ?? 0;
    const w_b = wBenchSector.get(sector) ?? 0;
    const portSyms = portSymbolsBySector.get(sector) ?? [];
    const benchSyms = benchSymbolsBySector.get(sector) ?? [];

    const R_p = weightedSectorReturn(portSyms, symbolReturns, 0);
    const R_b = weightedSectorReturn(benchSyms, symbolReturns, benchmarkReturn);

    const allocation = (w_p - w_b) * R_b;
    const selection = w_p * (R_p - R_b);
    const interaction = (w_p - w_b) * (R_p - R_b);

    rows.push({
      sector,
      weight: w_p,
      benchmarkWeight: w_b,
      sectorRet: R_p,
      benchmarkSectorRet: R_b,
      allocation,
      selection,
      interaction,
      total: allocation + selection + interaction,
    });
  }

  return rows.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}
