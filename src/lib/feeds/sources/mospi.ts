import { dataGovKey } from "@/lib/datagov/client";
import { feedFetch } from "@/lib/feeds/http";
import type { LiveMacroSeries } from "@/lib/feeds/types";

/**
 * MOSPI publishes CPI via data.gov.in open API (no key for basic catalog).
 * Falls back gracefully if the gateway is unreachable.
 */
export async function fetchMospiMacro(): Promise<LiveMacroSeries[]> {
  const key = dataGovKey();
  const url = `https://api.data.gov.in/resource/all-india-consumer-price-index-numbers-general?api-key=${key}&format=json&limit=24`;
  const res = await feedFetch(url, { timeoutMs: 10_000 });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    records?: { Year?: string; Month?: string; CPI?: string; Value?: string }[];
  };
  const points =
    json.records
      ?.map((r) => {
        const value = Number(r.CPI ?? r.Value);
        const date = r.Year && r.Month ? `${r.Year}-${r.Month}` : r.Year ?? "";
        return { date, value };
      })
      .filter((p) => p.date && Number.isFinite(p.value)) ?? [];
  if (!points.length) return [];
  const latest = points[points.length - 1]!.value;
  const prev = points[points.length - 2]?.value ?? latest;
  return [
    {
      id: "mospi_cpi",
      name: "India CPI (MOSPI)",
      unit: "index",
      source: "mospi",
      latest,
      change: latest - prev,
      points,
    },
  ];
}
