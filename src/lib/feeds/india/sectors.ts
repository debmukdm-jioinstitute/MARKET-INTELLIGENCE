import { fetchNseAllIndices } from "@/lib/feeds/india/nse-market";

export type RotationStage = "Leading" | "Weakening" | "Lagging" | "Improving";

export type SectorRow = {
  name: string;
  /** Fractions: 0.012 = +1.2%. */
  return1D: number | null;
  return1M: number | null;
  return1Y: number | null;
  pe: number | null;
  pb: number | null;
  dividendYield: number | null;
  rotationStage: RotationStage | null;
};

export type SectorsPayload = { fetchedAt: string; benchmark: string; rows: SectorRow[] };

/** NSE sector index names as they appear in /api/allIndices; any the feed lacks are simply omitted. */
const SECTORS = [
  "NIFTY BANK", "NIFTY IT", "NIFTY AUTO", "NIFTY FMCG", "NIFTY PHARMA", "NIFTY METAL", "NIFTY REALTY", "NIFTY ENERGY",
  "NIFTY FINANCIAL SERVICES", "NIFTY PSU BANK", "NIFTY PRIVATE BANK", "NIFTY MEDIA", "NIFTY OIL & GAS",
  "NIFTY HEALTHCARE INDEX", "NIFTY CONSUMER DURABLES", "NIFTY INFRASTRUCTURE", "NIFTY CONSUMPTION", "NIFTY COMMODITIES",
];
const BENCHMARK = "NIFTY 50";

const frac = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v) / 100);
const plain = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) || Number(v) === 0 ? null : Number(v));

/** Relative to the benchmark: ahead over a year and a month = Leading; ahead over a year only = Weakening; etc. */
export function rotationStage(rel1Y: number | null, rel1M: number | null): RotationStage | null {
  if (rel1Y == null || rel1M == null) return null;
  if (rel1Y > 0) return rel1M > 0 ? "Leading" : "Weakening";
  return rel1M > 0 ? "Improving" : "Lagging";
}

export async function buildSectors(): Promise<SectorsPayload> {
  const all = await fetchNseAllIndices();
  const byName = new Map(all.map((r) => [r.index.toUpperCase(), r]));
  const bench = byName.get(BENCHMARK);
  const b1M = frac(bench?.perChange30d);
  const b1Y = frac(bench?.perChange365d);
  const rows: SectorRow[] = SECTORS.flatMap((n) => {
    const r = byName.get(n);
    if (!r) return [];
    const return1M = frac(r.perChange30d);
    const return1Y = frac(r.perChange365d);
    return [{
      name: r.index.replace(/^NIFTY /i, "").replace(/ INDEX$/i, "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bIt\b/, "IT").replace(/\bFmcg\b/, "FMCG").replace(/\bPsu\b/, "PSU"),
      return1D: frac(r.percentChange),
      return1M,
      return1Y,
      pe: plain(r.pe),
      pb: plain(r.pb),
      dividendYield: plain(r.dy) == null ? null : Number(r.dy) / 100,
      rotationStage: rotationStage(return1Y != null && b1Y != null ? return1Y - b1Y : null, return1M != null && b1M != null ? return1M - b1M : null),
    }];
  });
  return { fetchedAt: new Date().toISOString(), benchmark: BENCHMARK, rows };
}
