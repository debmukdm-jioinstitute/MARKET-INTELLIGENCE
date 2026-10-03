import { CACHE, collectorFailure, curveOf, lastDays, latestOf, loadAltSeries, type AltSeries } from "@/lib/macro/alt-data";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FBIL = "https://www.fbil.org.in/";

/** FBIL benchmarks: USD/INR reference, MIBOR / OIS / T-bill curves, G-Sec par-yield curve + 10Y 30-day series. */
export async function GET() {
  const series = await loadAltSeries({
    ids: ["fbil_ref_usd", "fbil_ref_eur", "fbil_ref_gbp", "fbil_ref_jpy", "fbil_mibor_on", "fbil_mror", "fbil_sorr"],
    prefixes: ["fbil_ois_", "fbil_tbill_", "fbil_tmibor_", "fbil_gsec_par_", "fbil_cd_", "fbil_fwdprem_"],
    sinceDays: 120,
  });
  const by = (id: string): AltSeries | undefined => series.find((s) => s.id === id);
  const ref = (id: string, code: string) => {
    const s = by(id);
    const last = latestOf(s);
    const prev = s && s.points.length > 1 ? s.points[s.points.length - 2]!.value : null;
    return last ? { code, date: last.date, value: last.value, prev, unit: s!.unit, url: s!.url, series: lastDays(s!.points, 30) } : null;
  };
  const gsec10 = by("fbil_gsec_par_10y");
  const dates = series.map((s) => latestOf(s)?.date).filter((d): d is string => !!d).sort();
  const asOf = dates.length ? dates[dates.length - 1]! : null;
  const available = series.length > 0;
  return NextResponse.json(
    {
      available,
      asOf,
      source: { name: "FBIL (Financial Benchmarks India)", url: FBIL },
      error: available ? null : await collectorFailure("fbil-rates"),
      usdInr: ref("fbil_ref_usd", "USD"),
      otherRefs: [ref("fbil_ref_eur", "EUR"), ref("fbil_ref_gbp", "GBP"), ref("fbil_ref_jpy", "JPY")].filter(Boolean),
      overnight: {
        mibor: ref("fbil_mibor_on", "MIBOR"),
        mror: ref("fbil_mror", "MROR"),
        sorr: ref("fbil_sorr", "SORR"),
      },
      mibor: { ois: curveOf(series, "fbil_ois_"), term: curveOf(series, "fbil_tmibor_") },
      tbill: curveOf(series, "fbil_tbill_"),
      certificateOfDeposit: curveOf(series, "fbil_cd_"),
      forwardPremia: curveOf(series, "fbil_fwdprem_"),
      gsec: {
        parYieldCurve: curveOf(series, "fbil_gsec_par_"),
        tenYear: gsec10 && gsec10.points.length ? { ...latestOf(gsec10)!, url: gsec10.url, series: lastDays(gsec10.points, 30) } : null,
      },
    },
    { headers: { "Cache-Control": CACHE.sixHours } },
  );
}
