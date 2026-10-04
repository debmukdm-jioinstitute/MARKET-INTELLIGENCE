import { CACHE, collectorFailure, latestOf, loadAltSeries, yoyPct } from "@/lib/macro/alt-data";
import { NextResponse } from "next/server";

export const revalidate = 300;
const PAGE = "https://www.npci.org.in/what-we-do/upi/product-statistics";

/** NPCI UPI monthly volume (million) and value (₹ crore): 24-month series + YoY for every month with a stored year-ago month. */
export async function GET() {
  const series = await loadAltSeries({ ids: ["upi_volume_mn", "upi_value_cr"], sinceDays: 366 * 3 });
  const vol = series.find((s) => s.id === "upi_volume_mn");
  const val = series.find((s) => s.id === "upi_value_cr");
  const shape = (s: typeof vol) =>
    (s?.points ?? []).slice(-24).map((p) => ({ month: p.date.slice(0, 7), value: p.value, yoyPct: yoyPct(s!.points, p.date) }));
  const lv = latestOf(vol);
  const lc = latestOf(val);
  const available = !!(lv || lc);
  return NextResponse.json(
    {
      available,
      source: { name: "NPCI", url: PAGE },
      error: available ? null : await collectorFailure("upi-stats"),
      latestMonth: (lv ?? lc)?.date.slice(0, 7) ?? null,
      volumeMn: { latest: lv?.value ?? null, yoyPct: vol && lv ? yoyPct(vol.points, lv.date) : null, series: shape(vol) },
      valueCr: { latest: lc?.value ?? null, yoyPct: val && lc ? yoyPct(val.points, lc.date) : null, series: shape(val) },
    },
    { headers: { "Cache-Control": CACHE.week } },
  );
}
