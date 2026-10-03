import { CACHE, collectorFailure, lastDays, latestOf, loadAltSeries, yoyPct } from "@/lib/macro/alt-data";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Grid-India all-India power demand: 90-day series + the latest day with YoY (from the stored year-ago day). */
export async function GET() {
  const series = await loadAltSeries({ ids: ["power_demand_met_mw", "power_energy_met_mu"], sinceDays: 400 });
  const demand = series.find((s) => s.id === "power_demand_met_mw");
  const energy = series.find((s) => s.id === "power_energy_met_mu");
  const last = latestOf(demand);
  const lastEnergy = latestOf(energy);
  return NextResponse.json(
    {
      available: !!last,
      source: { name: "Grid-India (NLDC)", url: demand?.url ?? "https://grid-india.in/en/reports/daily-psp-report" },
      error: last ? null : await collectorFailure("power-demand"),
      latest: last
        ? {
            day: last.date,
            demandMw: last.value,
            demandGw: Math.round(last.value / 100) / 10,
            yoyPct: demand ? yoyPct(demand.points, last.date, 1) : null,
            energyMu: lastEnergy?.date === last.date ? lastEnergy.value : null,
            energyYoyPct: energy && lastEnergy ? yoyPct(energy.points, lastEnergy.date, 1) : null,
          }
        : null,
      series: demand ? lastDays(demand.points, 90).map((p) => ({ day: p.date, demandMw: p.value })) : [],
    },
    { headers: { "Cache-Control": CACHE.day } },
  );
}
