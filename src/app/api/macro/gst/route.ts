import { CACHE, collectorFailure, latestOf, loadAltSeries, yoyPct } from "@/lib/macro/alt-data";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Gross GST collections (₹ crore) from the Ministry of Finance PIB release. Honest empty state when PIB blocks the collector. */
export async function GET() {
  const series = await loadAltSeries({ ids: ["gst_gross_cr"], sinceDays: 366 * 3 });
  const s = series[0];
  const last = latestOf(s);
  return NextResponse.json(
    {
      available: !!last,
      source: { name: "Ministry of Finance / PIB", url: s?.url ?? "https://pib.gov.in/indexd.aspx?reg=3&lang=1" },
      error: last ? null : await collectorFailure("gst-collections"),
      latestMonth: last?.date.slice(0, 7) ?? null,
      latest: last?.value ?? null,
      yoyPct: s && last ? yoyPct(s.points, last.date) : null,
      series: (s?.points ?? []).slice(-24).map((p) => ({ month: p.date.slice(0, 7), value: p.value, yoyPct: yoyPct(s!.points, p.date) })),
    },
    { headers: { "Cache-Control": CACHE.week } },
  );
}
