import { CACHE, collectorFailure, loadAltSeries } from "@/lib/macro/alt-data";
import { MONSOON_POINTS, rainSeriesId } from "@/lib/collector/sources/monsoon";
import { computeMonsoon } from "@/lib/macro/monsoon";
import { NextResponse } from "next/server";

export const revalidate = 300;

/** Monsoon proxy: season-to-date (Jun–Sep) or last-90-day rainfall as % of the average of earlier stored years. */
export async function GET() {
  const series = await loadAltSeries({ ids: MONSOON_POINTS.map((p) => rainSeriesId(p.id)), sinceDays: 366 * 6 + 5 });
  const byLoc: Record<string, { date: string; value: number }[]> = {};
  for (const s of series) byLoc[s.id] = s.points;
  const today = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10); // IST calendar day
  const result = computeMonsoon(byLoc, today);
  const available = result.mode !== "none";
  return NextResponse.json(
    {
      available,
      source: { name: "Open-Meteo (weather-model rainfall, not IMD gauges)", url: "https://open-meteo.com/en/docs/historical-weather-api" },
      error: available ? null : await collectorFailure("monsoon"),
      points: MONSOON_POINTS.map((p) => ({ id: p.id, label: p.label, lat: p.lat, lon: p.lon })),
      ...result,
    },
    { headers: { "Cache-Control": CACHE.day } },
  );
}
