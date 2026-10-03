import { feedFetch } from "@/lib/feeds/http";
import type { Collector, Obs, SeriesResult } from "../types";

/**
 * World Bank — India annual macro indicators. Keyless JSON, one request per indicator.
 * Annual data barely moves, so this runs from the Actions runner only; the series are
 * idempotent upserts. An indicator that fails or comes back empty is skipped and logged;
 * the collector throws (records a failure) only when nothing came back at all.
 *
 * Observation date = 31 Dec of the data year (the value describes that whole calendar year).
 */

export const WB_INDICATORS: { code: string; label: string; unit: string }[] = [
  { code: "NY.GDP.MKTP.CD", label: "GDP (current US$)", unit: "US$" },
  { code: "FP.CPI.TOTL", label: "Consumer price index (2010 = 100)", unit: "index" },
  { code: "FP.CPI.TOTL.ZG", label: "Inflation, consumer prices (annual %)", unit: "%" },
  { code: "NE.EXP.GNFS.ZS", label: "Exports of goods and services (% of GDP)", unit: "% of GDP" },
  { code: "NE.IMP.GNFS.ZS", label: "Imports of goods and services (% of GDP)", unit: "% of GDP" },
  { code: "GC.DOD.TOTL.GD.ZS", label: "Central government debt (% of GDP)", unit: "% of GDP" },
  { code: "FR.INR.RINR", label: "Real interest rate (%)", unit: "%" },
];

export const wbSeriesId = (code: string) => `wb_in_${code.toLowerCase().replace(/\./g, "_")}`;

type WbRow = { date?: string; value?: number | null };

export function parseWorldBank(json: unknown): Obs[] {
  const rows = Array.isArray(json) && Array.isArray(json[1]) ? (json[1] as WbRow[]) : [];
  const out: Obs[] = [];
  for (const r of rows) {
    const year = /^\d{4}$/.test(r.date ?? "") ? r.date! : null;
    if (!year || typeof r.value !== "number" || !Number.isFinite(r.value)) continue; // null = not published; never filled
    out.push({ date: `${year}-12-31`, value: r.value });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const worldbankIndia: Collector = {
  id: "worldbank-india",
  actionsOnly: true,
  async run() {
    const out: SeriesResult[] = [];
    const failed: string[] = [];
    for (const ind of WB_INDICATORS) {
      const url = `https://api.worldbank.org/v2/country/IN/indicator/${ind.code}?format=json&date=2010:2026&per_page=100`;
      try {
        const res = await feedFetch(url, { timeoutMs: 25_000 });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const obs = parseWorldBank(await res.json());
        if (!obs.length) throw new Error("no published values");
        out.push({
          id: wbSeriesId(ind.code),
          label: ind.label,
          unit: ind.unit,
          category: "macro",
          provider: "World Bank",
          url: `https://data.worldbank.org/indicator/${ind.code}?locations=IN`,
          obs,
        });
      } catch (e) {
        failed.push(`${ind.code}: ${e instanceof Error ? e.message : String(e)}`);
      }
      await sleep(300);
    }
    if (!out.length) throw new Error(`worldbank-india: nothing collected (${failed.join(" | ")})`);
    if (failed.length) console.warn(JSON.stringify({ level: "warn", msg: "worldbank partial failure", failed }));
    return out;
  },
};
