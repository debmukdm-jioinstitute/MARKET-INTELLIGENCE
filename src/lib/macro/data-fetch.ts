import { feedFetch } from "@/lib/feeds/http";
import type { MacroRow } from "@/lib/feeds/india/types";
import { fetchFredSeriesCsv } from "@/lib/feeds/sources/fred";
import type { MacroMetric } from "@/lib/macro/types";

const DATA_GOV_KEY =
  process.env.DATA_GOV_IN_API_KEY?.trim() ||
  "579b464db66ec23bdd000001cdd3946e44cce2f45628f8dc59a380bfa1e971e";

export function metricFromRow(row: MacroRow): MacroMetric {
  return {
    id: row.id,
    label: row.indicator,
    value: row.current,
    unit: row.unit,
    previous: row.previous,
    change:
      row.current != null && row.previous != null ? row.current - row.previous : undefined,
    history: row.history12m,
    source: row.source,
  };
}

export async function fetchWorldBankIndicator(
  country: string,
  code: string,
  name: string,
  unit: string,
): Promise<MacroRow> {
  const url = `https://api.worldbank.org/v2/country/${country}/indicator/${code}?format=json&per_page=20`;
  try {
    const res = await feedFetch(url, { timeoutMs: 12_000 });
    const json = (await res.json()) as [unknown, { date: string; value: number | null }[]];
    const rows = (json[1] ?? [])
      .filter((r) => r.value != null)
      .map((r) => ({ date: r.date, value: r.value as number }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const current = rows[rows.length - 1]?.value ?? null;
    const previous = rows[rows.length - 2]?.value ?? null;
    let direction: MacroRow["direction"] = "na";
    if (current != null && previous != null) {
      if (current > previous * 1.001) direction = "up";
      else if (current < previous * 0.999) direction = "down";
      else direction = "flat";
    }
    return {
      id: `${country}_${code}`,
      indicator: name,
      current,
      previous,
      unit,
      direction,
      history12m: rows.slice(-24),
      source: { provider: "World Bank", url, asOf: new Date().toISOString() },
    };
  } catch {
    return {
      id: `${country}_${code}`,
      indicator: name,
      current: null,
      previous: null,
      unit,
      direction: "na",
      history12m: [],
      source: { provider: "World Bank", url },
    };
  }
}

export async function fetchFredMetric(
  seriesId: string,
  id: string,
  label: string,
  unit: string,
): Promise<MacroMetric> {
  const history = await fetchFredSeriesCsv(seriesId);
  const current = history[history.length - 1]?.value ?? null;
  const previous = history[history.length - 2]?.value ?? null;
  return {
    id,
    label,
    value: current,
    unit,
    previous,
    change: current != null && previous != null ? current - previous : undefined,
    history: history.slice(-48),
    source: {
      provider: "FRED",
      url: `https://fred.stlouisfed.org/series/${seriesId}`,
      asOf: new Date().toISOString(),
    },
  };
}

export async function fetchCpiIndexSeries(): Promise<{ date: string; value: number }[]> {
  const url = `https://api.data.gov.in/resource/all-india-consumer-price-index-numbers-general?api-key=${DATA_GOV_KEY}&format=json&limit=48`;
  try {
    const res = await feedFetch(url, { timeoutMs: 12_000 });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      records?: { Year?: string; Month?: string; CPI?: string; Value?: string }[];
    };
    const points =
      json.records
        ?.map((r) => {
          const value = Number(r.CPI ?? r.Value);
          const month = r.Month?.padStart(2, "0") ?? "01";
          const date = r.Year ? `${r.Year}-${month}` : "";
          return { date, value };
        })
        .filter((p) => p.date && Number.isFinite(p.value))
        .sort((a, b) => a.date.localeCompare(b.date)) ?? [];
    return points;
  } catch {
    return [];
  }
}

export function cpiYoYFromIndex(points: { date: string; value: number }[]) {
  const byMonth = new Map(points.map((p) => [p.date, p.value]));
  const out: { date: string; value: number }[] = [];
  for (const p of points) {
    const [y, m] = p.date.split("-");
    if (!y || !m) continue;
    const prev = byMonth.get(`${Number(y) - 1}-${m}`);
    if (prev == null || !prev) continue;
    out.push({ date: p.date, value: ((p.value - prev) / prev) * 100 });
  }
  return out;
}

export function inflationMomentum(points: { date: string; value: number }[]) {
  const last = points[points.length - 1];
  if (!last) {
    return {
      yoy: null as number | null,
      m1: null as number | null,
      m3: null as number | null,
      m6: null as number | null,
    };
  }
  const idx = (lag: number) => points[points.length - 1 - lag]?.value;
  const yoyPt = cpiYoYFromIndex(points);
  const yoy = yoyPt[yoyPt.length - 1]?.value ?? null;
  const v0 = last.value;
  const ann = (lag: number, power: number) => {
    const v = idx(lag);
    if (v == null || !v) return null;
    return (Math.pow(v0 / v, power) - 1) * 100;
  };
  return { yoy, m1: ann(1, 12), m3: ann(3, 4), m6: ann(6, 2) };
}

type CpiGroupRow = { group: string; index: number; weight?: number };

export async function fetchCpiGroupBreakdown(): Promise<CpiGroupRow[]> {
  const resources = [
    "current-month-and-last-year-same-month-cpi-and-group-wise-weights",
    "all-india-consumer-price-index-numbers-group-wise",
  ];
  for (const resource of resources) {
    const url = `https://api.data.gov.in/resource/${resource}?api-key=${DATA_GOV_KEY}&format=json&limit=80`;
    try {
      const res = await feedFetch(url, { timeoutMs: 12_000 });
      if (!res.ok) continue;
      const json = (await res.json()) as { records?: Record<string, string>[] };
      const records = json.records ?? [];
      if (!records.length) continue;
      const latest = records[records.length - 1]!;
      const out: CpiGroupRow[] = [];
      for (const [key, raw] of Object.entries(latest)) {
        if (!key || key === "Year" || key === "Month" || key === "State") continue;
        const value = Number(String(raw).replace(/,/g, ""));
        if (!Number.isFinite(value)) continue;
        const group = key.replace(/_/g, " ").replace(/CPI/gi, "").trim();
        if (!group) continue;
        out.push({ group, index: value });
      }
      if (out.length >= 4) return out.slice(0, 24);
    } catch {
      /* try next resource */
    }
  }
  return [];
}

export function staticCpiBasket(): CpiGroupRow[] {
  return [
    { group: "Food & beverages", index: 42, weight: 39 },
    { group: "Pan, tobacco & intoxicants", index: 38, weight: 2 },
    { group: "Clothing & footwear", index: 35, weight: 7 },
    { group: "Housing", index: 28, weight: 10 },
    { group: "Fuel & light", index: 32, weight: 7 },
    { group: "Miscellaneous", index: 40, weight: 35 },
  ];
}
