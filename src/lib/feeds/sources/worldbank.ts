import { feedFetch } from "@/lib/feeds/http";
import type { LiveMacroSeries } from "@/lib/feeds/types";

const INDICATORS = [
  { id: "wb_gdp_us", code: "NY.GDP.MKTP.KD.ZG", country: "US", name: "US GDP growth", unit: "% y/y" },
  { id: "wb_gdp_in", code: "NY.GDP.MKTP.KD.ZG", country: "IN", name: "India GDP growth", unit: "% y/y" },
  { id: "wb_infl_in", code: "FP.CPI.TOTL.ZG", country: "IN", name: "India CPI inflation", unit: "% y/y" },
];

export async function fetchWorldBankMacro(): Promise<LiveMacroSeries[]> {
  const out: LiveMacroSeries[] = [];
  for (const ind of INDICATORS) {
    const url = `https://api.worldbank.org/v2/country/${ind.country}/indicator/${ind.code}?format=json&per_page=12`;
    const res = await feedFetch(url);
    if (!res.ok) throw new Error(`World Bank HTTP ${res.status}`);
    const json = (await res.json()) as [
      unknown,
      { date: string; value: number | null; indicator?: { value?: string } }[],
    ];
    const rows = (json[1] ?? [])
      .filter((r) => r.value != null)
      .map((r) => ({ date: r.date, value: r.value as number }))
      .reverse();
    if (!rows.length) continue;
    const latest = rows[rows.length - 1]!.value;
    const prev = rows[rows.length - 2]?.value ?? latest;
    out.push({
      id: ind.id,
      name: ind.name,
      unit: ind.unit,
      source: "worldbank",
      latest,
      change: latest - prev,
      points: rows,
    });
  }
  return out;
}
