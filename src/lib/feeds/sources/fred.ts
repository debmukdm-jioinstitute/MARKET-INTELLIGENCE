import { feedFetch } from "@/lib/feeds/http";
import type { LiveMacroSeries, MacroPoint } from "@/lib/feeds/types";

const SERIES: { id: string; fred: string; name: string; unit: string }[] = [
  { id: "fred_gdp", fred: "GDP", name: "US GDP", unit: "Bn USD" },
  { id: "fred_cpi", fred: "CPIAUCSL", name: "US CPI", unit: "index" },
  { id: "fred_unrate", fred: "UNRATE", name: "US Unemployment", unit: "%" },
  { id: "fred_fedfunds", fred: "DFF", name: "Fed Funds Effective", unit: "%" },
  { id: "fred_ust10", fred: "DGS10", name: "US 10Y Treasury", unit: "%" },
  { id: "fred_vix", fred: "VIXCLS", name: "VIX", unit: "idx" },
];

async function fredObservations(seriesId: string, limit = 60): Promise<MacroPoint[]> {
  const key = process.env.FRED_API_KEY;
  if (!key) return [];
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${key}&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await feedFetch(url);
  if (!res.ok) throw new Error(`FRED HTTP ${res.status}`);
  const json = (await res.json()) as {
    observations?: { date: string; value: string }[];
  };
  const rows = (json.observations ?? [])
    .filter((o) => o.value !== ".")
    .map((o) => ({ date: o.date, value: Number(o.value) }))
    .filter((o) => Number.isFinite(o.value));
  return rows.reverse();
}

const CSV_URL = (seriesId: string) => `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`;

/**
 * FRED's public CSV export — no API key needed. Used for series we want even
 * when FRED_API_KEY isn't configured (e.g. India 10Y G-Sec, which has no
 * working Yahoo symbol — "IN10YT=RR" is delisted).
 */
export async function fetchFredSeriesCsv(seriesId: string): Promise<MacroPoint[]> {
  try {
    const res = await feedFetch(CSV_URL(seriesId), { timeoutMs: 15_000 });
    if (!res.ok) return [];
    const text = await res.text();
    return text
      .trim()
      .split("\n")
      .slice(1)
      .map((line) => {
        const [date, raw] = line.split(",");
        return { date, value: Number(raw) };
      })
      .filter((p) => p.date && Number.isFinite(p.value));
  } catch {
    return [];
  }
}

export async function fetchFredMacro(): Promise<LiveMacroSeries[]> {
  const key = process.env.FRED_API_KEY;
  if (!key) return [];
  const out: LiveMacroSeries[] = [];
  for (const s of SERIES) {
    const points = await fredObservations(s.fred, 48);
    if (!points.length) continue;
    const latest = points[points.length - 1]!.value;
    const prev = points[points.length - 2]?.value ?? latest;
    out.push({
      id: s.id,
      name: s.name,
      unit: s.unit,
      source: "fred",
      latest,
      change: latest - prev,
      points,
    });
  }
  return out;
}
