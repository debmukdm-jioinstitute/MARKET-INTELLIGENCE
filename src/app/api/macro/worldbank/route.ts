import { CACHE, collectorFailure, latestOf, loadAltSeries } from "@/lib/macro/alt-data";
import { WB_INDICATORS, wbSeriesId } from "@/lib/collector/sources/worldbank";
import { NextResponse } from "next/server";

export const revalidate = 300;

/** World Bank India annual indicators: latest published value + 10-year series (the "year" is the data year, not today). */
export async function GET() {
  const series = await loadAltSeries({ ids: WB_INDICATORS.map((i) => wbSeriesId(i.code)), sinceDays: 366 * 11 });
  const indicators = WB_INDICATORS.map((i) => {
    const s = series.find((x) => x.id === wbSeriesId(i.code));
    const last = latestOf(s);
    const prev = s && s.points.length > 1 ? s.points[s.points.length - 2]! : null;
    return {
      code: i.code,
      label: i.label,
      unit: i.unit,
      url: `https://data.worldbank.org/indicator/${i.code}?locations=IN`,
      latest: last ? { year: Number(last.date.slice(0, 4)), value: last.value } : null,
      previous: prev ? { year: Number(prev.date.slice(0, 4)), value: prev.value } : null,
      series: (s?.points ?? []).map((p) => ({ year: Number(p.date.slice(0, 4)), value: p.value })),
    };
  });
  const available = indicators.some((i) => i.latest);
  return NextResponse.json(
    { available, source: { name: "World Bank", url: "https://data.worldbank.org/country/india" }, error: available ? null : await collectorFailure("worldbank-india"), indicators },
    { headers: { "Cache-Control": CACHE.week } },
  );
}
