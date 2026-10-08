import { fetchNseIndexConstituentSymbols } from "@/lib/feeds/india/nse-index-constituents";
import { getBenchmarkWeightsSnapshot } from "@/lib/my-portfolio/benchmarks";
import { NIFTY_500 } from "@/lib/prowess/nifty500";

export type Nifty50Constituent = { symbol: string; name: string; sector: string; weightPct: number | null };
export type Nifty50SectorWeight = { name: string; weightPct: number | null; count: number };
export type Nifty50Live = {
  asOf: string | null;
  /** How the weights were derived, or why they are missing. */
  weightMethod: string;
  constituents: Nifty50Constituent[];
  sectorWeights: Nifty50SectorWeight[];
};

const BY_SYMBOL = new Map(NIFTY_500.map(([s, name, sector]) => [s, { name, sector }]));

/**
 * Nifty 50 membership from the NSE constituent file, weighted by live market cap (an approximation of
 * free-float weights, labelled as such). Weights are null, never invented, when the live feeds fail.
 */
export async function getNifty50Live(): Promise<Nifty50Live> {
  const [symbols, snap] = await Promise.all([
    fetchNseIndexConstituentSymbols("ind_nifty50list.csv").catch(() => [] as string[]),
    getBenchmarkWeightsSnapshot("NIFTY50").catch(() => null),
  ]);
  const weights = snap?.weights ?? {};
  const haveWeights = Object.keys(weights).length > 0;
  const constituents = symbols
    .map((symbol) => {
      const meta = BY_SYMBOL.get(symbol);
      const w = weights[symbol.toUpperCase()];
      return {
        symbol,
        name: meta?.name ?? symbol,
        sector: meta?.sector ?? "—",
        weightPct: haveWeights && w != null ? Math.round(w * 10_000) / 100 : null,
      };
    })
    .sort((a, b) => (b.weightPct ?? -1) - (a.weightPct ?? -1) || a.symbol.localeCompare(b.symbol));

  const bySector = new Map<string, { w: number; n: number; known: boolean }>();
  for (const c of constituents) {
    const cur = bySector.get(c.sector) ?? { w: 0, n: 0, known: true };
    cur.n += 1;
    if (c.weightPct == null) cur.known = false;
    else cur.w += c.weightPct;
    bySector.set(c.sector, cur);
  }
  const sectorWeights = [...bySector.entries()]
    .map(([name, v]) => ({ name, weightPct: v.known ? Math.round(v.w * 100) / 100 : null, count: v.n }))
    .sort((a, b) => (b.weightPct ?? -1) - (a.weightPct ?? -1));

  return {
    asOf: snap?.asOf || null,
    weightMethod: haveWeights ? "NSE constituent list weighted by live market cap (approximates free-float weights)" : "unavailable: live weights could not be computed",
    constituents,
    sectorWeights,
  };
}
