import { feedFetch } from "@/lib/feeds/http";
import type { LiveMacroSeries } from "@/lib/feeds/types";

/** IMF DataMapper — free JSON, no API key. */
export async function fetchImfMacro(): Promise<LiveMacroSeries[]> {
  const url =
    "https://www.imf.org/external/datamapper/api/v1/PCPIPCH/USA?periods=2019,2020,2021,2022,2023,2024,2025";
  const res = await feedFetch(url);
  if (!res.ok) throw new Error(`IMF HTTP ${res.status}`);
  const json = (await res.json()) as {
    values?: { PCPIPCH?: Record<string, Record<string, number | null>> };
  };
  const block = json.values?.PCPIPCH?.USA;
  if (!block) return [];
  const points = Object.entries(block)
    .filter(([, v]) => v != null)
    .map(([date, value]) => ({ date, value: value as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!points.length) return [];
  const latest = points[points.length - 1]!.value;
  const prev = points[points.length - 2]?.value ?? latest;
  return [
    {
      id: "imf_cpi_weo",
      name: "IMF CPI inflation (WEO)",
      unit: "% y/y",
      source: "imf",
      latest,
      change: latest - prev,
      points,
    },
  ];
}
