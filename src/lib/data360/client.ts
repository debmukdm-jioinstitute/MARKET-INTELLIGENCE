import { feedFetch } from "@/lib/feeds/http";

export const DATA360_API = "https://data360api.worldbank.org";

export type Data360Obs = {
  OBS_VALUE: string | null;
  DATABASE_ID: string;
  INDICATOR: string;
  REF_AREA: string;
  TIME_PERIOD: string;
  UNIT_MEASURE?: string | null;
  FREQ?: string | null;
  [k: string]: unknown;
};

export type Data360DataPage = { count: number; value: Data360Obs[] };

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await feedFetch(url, { timeoutMs: 45_000, ...init });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Data360 ${url} → HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }
  return res.json() as Promise<T>;
}

/** Database IDs exposed in Data360 search facets (top catalogs). */
export async function listDatabaseIds(): Promise<{ id: string; count: number }[]> {
  const res = await json<{
    "@search.facets"?: { "series_description/database_id"?: { value: string; count: number }[] };
  }>(`${DATA360_API}/data360/searchv2`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      search: "*",
      top: 0,
      count: true,
      filter: "series_description/idno ne null",
      facets: ["series_description/database_id"],
    }),
  });
  const facets = res["@search.facets"]?.["series_description/database_id"] ?? [];
  return facets.map((f) => ({ id: f.value, count: f.count }));
}

export async function listIndicators(datasetId: string): Promise<string[]> {
  const url = `${DATA360_API}/data360/indicators?datasetId=${encodeURIComponent(datasetId)}`;
  const rows = await json<string[]>(url);
  if (!Array.isArray(rows)) throw new Error(`Data360 indicators not array for ${datasetId}`);
  return rows;
}

export async function fetchDataPage(opts: {
  databaseId: string;
  indicator: string;
  skip?: number;
  top?: number;
  refArea?: string;
}): Promise<Data360DataPage> {
  const sp = new URLSearchParams({
    DATABASE_ID: opts.databaseId,
    INDICATOR: opts.indicator,
    format: "json",
    top: String(opts.top ?? 1000),
    skip: String(opts.skip ?? 0),
  });
  if (opts.refArea) sp.set("REF_AREA", opts.refArea);
  return json<Data360DataPage>(`${DATA360_API}/data360/data?${sp}`);
}
