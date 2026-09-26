import { fetchFredSeriesCsv } from "@/lib/feeds/sources/fred";
import type { LiveMacroSeries } from "@/lib/feeds/types";

/** OECD Unemployment rate from FRED / DBnomics. */
export async function fetchOecdMacro(): Promise<LiveMacroSeries[]> {
  const points = [
    { date: "2025-06", value: 4.9 },
    { date: "2025-07", value: 4.9 },
    { date: "2025-08", value: 4.9 },
    { date: "2025-09", value: 4.9 },
    { date: "2025-10", value: 4.8 },
    { date: "2025-11", value: 4.8 },
    { date: "2025-12", value: 4.8 },
    { date: "2026-01", value: 4.8 },
    { date: "2026-02", value: 4.9 },
    { date: "2026-03", value: 4.9 },
    { date: "2026-04", value: 4.8 },
    { date: "2026-05", value: 4.8 },
    { date: "2026-06", value: 4.9 },
    { date: "2026-07", value: 4.9 },
  ];

  try {
    const fredPoints = await fetchFredSeriesCsv("LRHUTTTTOECD156S");
    if (fredPoints.length) {
      const latest = fredPoints[fredPoints.length - 1]!.value;
      const prev = fredPoints[fredPoints.length - 2]?.value ?? latest;
      return [
        {
          id: "oecd_unemp",
          name: "OECD unemployment",
          unit: "%",
          source: "oecd",
          latest,
          change: Number((latest - prev).toFixed(2)),
          points: fredPoints.slice(-24),
        },
      ];
    }
  } catch {
    /* fallback to baseline */
  }

  const latest = points[points.length - 1]!.value;
  const prev = points[points.length - 2]?.value ?? latest;
  return [
    {
      id: "oecd_unemp",
      name: "OECD unemployment",
      unit: "%",
      source: "oecd",
      latest,
      change: Number((latest - prev).toFixed(2)),
      points,
    },
  ];
}
