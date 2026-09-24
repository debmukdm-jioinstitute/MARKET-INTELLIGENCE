import { fetchCpiIndexSeries } from "@/lib/macro/data-fetch";
import type { LiveMacroSeries } from "@/lib/feeds/types";

/** All-India CPI (general index, combined) from data.gov.in; [] if the API key/dataset is unavailable. */
export async function fetchMospiMacro(): Promise<LiveMacroSeries[]> {
  const points = await fetchCpiIndexSeries();
  if (!points.length) return [];
  const latest = points[points.length - 1]!.value;
  const prev = points[points.length - 2]?.value ?? latest;
  return [
    {
      id: "mospi_cpi",
      name: "India CPI (MOSPI)",
      unit: "index",
      source: "mospi",
      latest,
      change: latest - prev,
      points,
    },
  ];
}
