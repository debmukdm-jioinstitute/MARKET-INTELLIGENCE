import { CACHE, collectorFailure, latestOf, loadAltSeries } from "@/lib/macro/alt-data";
import { NextResponse } from "next/server";

export const revalidate = 300;

const SEGMENTS = [
  { key: "pv", label: "Passenger vehicles" },
  { key: "2w", label: "Two-wheelers" },
  { key: "3w", label: "Three-wheelers" },
];

/** SIAM domestic auto sales by segment: latest month (units + YoY as stated by SIAM) and up to 12 months of units. */
export async function GET() {
  const ids = SEGMENTS.flatMap((s) => [`auto_${s.key}_units`, `auto_${s.key}_yoy_pct`]);
  const series = await loadAltSeries({ ids, sinceDays: 400 });
  const segments = SEGMENTS.map((seg) => {
    const u = series.find((s) => s.id === `auto_${seg.key}_units`);
    const y = series.find((s) => s.id === `auto_${seg.key}_yoy_pct`);
    const last = latestOf(u);
    const yoy = last && y ? y.points.find((p) => p.date === last.date)?.value ?? null : null;
    return {
      key: seg.key,
      label: seg.label,
      month: last?.date.slice(0, 7) ?? null,
      units: last?.value ?? null,
      yoyPct: yoy,
      url: u?.url ?? "https://www.siam.in/news-%26-updates/press-releases",
      series: (u?.points ?? []).slice(-12).map((p) => ({ month: p.date.slice(0, 7), units: p.value, yoyPct: y?.points.find((q) => q.date === p.date)?.value ?? null })),
    };
  });
  const available = segments.some((s) => s.units !== null);
  return NextResponse.json(
    {
      available,
      source: { name: "SIAM", url: "https://www.siam.in/news-%26-updates/press-releases" },
      note: "Commercial vehicles are not in SIAM's press-release text, so they are not shown.",
      error: available ? null : await collectorFailure("siam-auto"),
      segments,
    },
    { headers: { "Cache-Control": CACHE.week } },
  );
}
