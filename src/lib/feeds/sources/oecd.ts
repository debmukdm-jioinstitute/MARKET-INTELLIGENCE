import { feedFetch } from "@/lib/feeds/http";
import type { LiveMacroSeries } from "@/lib/feeds/types";

type OecdJson = {
  dataSets?: Array<{
    series?: Record<string, { observations?: Record<string, number[]> }>;
  }>;
  structure?: {
    dimensions?: { observation?: Array<{ values?: { id: string }[] }> };
  };
};

/** OECD SDMX-JSON — unemployment rate, OECD total. */
export async function fetchOecdMacro(): Promise<LiveMacroSeries[]> {
  const url =
    "https://stats.oecd.org/SDMX-JSON/data/MEI/OECD.UR.M?startTime=2019-01&endTime=2025-12&contentType=json";
  const res = await feedFetch(url);
  if (!res.ok) throw new Error(`OECD HTTP ${res.status}`);
  const json = (await res.json()) as OecdJson;
  const dataSet = json.dataSets?.[0];
  const seriesMap = dataSet?.series ?? {};
  const series = Object.values(seriesMap)[0];
  const timeDim = json.structure?.dimensions?.observation?.[0]?.values ?? [];
  if (!series?.observations) return [];
  const points = Object.entries(series.observations)
    .map(([idx, obs]) => ({
      date: timeDim[Number(idx)]?.id ?? idx,
      value: obs[0]!,
    }))
    .filter((p) => Number.isFinite(p.value))
    .slice(-48);
  if (!points.length) return [];
  const latest = points[points.length - 1]!.value;
  const prev = points[points.length - 2]?.value ?? latest;
  return [
    {
      id: "oecd_unemp",
      name: "OECD unemployment",
      unit: "%",
      source: "oecd",
      latest,
      change: latest - prev,
      points,
    },
  ];
}
