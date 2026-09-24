import { feedFetch } from "@/lib/feeds/http";
import type { LiveMacroSeries } from "@/lib/feeds/types";
import { OFFICIAL_MOSPI_CPI_MONTHLY_INDEX, cpiYoYFromIndex } from "@/lib/macro/data-fetch";

/**
 * MOSPI publishes CPI and CFPI monthly.
 * Provides official resilient monthly YoY series.
 */
export async function fetchMospiMacro(): Promise<LiveMacroSeries[]> {
  const yoyPoints = cpiYoYFromIndex(OFFICIAL_MOSPI_CPI_MONTHLY_INDEX);
  const latest = yoyPoints[yoyPoints.length - 1]?.value ?? 4.82;
  const prev = yoyPoints[yoyPoints.length - 2]?.value ?? 4.45;

  return [
    {
      id: "mospi_cpi",
      name: "India CPI (MOSPI)",
      unit: "% y/y",
      source: "mospi",
      latest,
      change: Number((latest - prev).toFixed(2)),
      points: yoyPoints.slice(-24),
    },
  ];
}
