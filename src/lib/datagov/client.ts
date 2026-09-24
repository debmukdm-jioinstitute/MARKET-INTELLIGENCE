/**
 * data.gov.in Open Government Data (OGD) client.
 *
 * Two endpoints, two auth situations:
 *  - `/lists`     (catalog: 180k+ datasets, searchable) — works with any key, including the public sample key.
 *  - `/resource/{uuid}` (actual rows)                    — needs a personal API key (free, https://data.gov.in/user/register).
 *
 * Set DATA_GOV_IN_API_KEY. Without a personal key the catalog still works and resource calls throw DataGovAuthError.
 */

const BASE = "https://api.data.gov.in";
/** Public sample key published by data.gov.in — catalog only, rows are rejected with "Key not authorised". */
const SAMPLE_KEY = "579b464db66ec23bdd000001cdd3946e44cce2f45628f8dc59a380bfa1e971e";

export class DataGovAuthError extends Error {
  constructor(msg = "data.gov.in rejected the API key (\"Key not authorised\"). Set a personal DATA_GOV_IN_API_KEY.") {
    super(msg);
    this.name = "DataGovAuthError";
  }
}

export function dataGovKey(): string {
  return process.env.DATA_GOV_IN_API_KEY?.trim() || SAMPLE_KEY;
}
export function hasPersonalKey(): boolean {
  const k = process.env.DATA_GOV_IN_API_KEY?.trim();
  return Boolean(k) && k !== SAMPLE_KEY;
}

export interface CatalogEntry {
  id: string; // resource uuid ("index_name")
  title: string;
  description: string | null;
  org: string[];
  sector: string[];
  orgType: string | null;
  catalogId: string | null;
  fields: { id: string; name: string; type: string }[];
  createdAt: number | null;
  updatedAt: number | null;
  active: boolean;
}

export interface CatalogQuery {
  title?: string;
  sector?: string;
  org?: string;
  offset?: number;
  limit?: number;
}

async function getJson<T>(path: string, params: Record<string, string | number | undefined>, timeoutMs = 30_000, attempts = 3): Promise<T> {
  const url = new URL(path, BASE);
  url.searchParams.set("api-key", dataGovKey());
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));

  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctl.signal, headers: { Accept: "application/json", "User-Agent": "MarketIntelligence/1.0" } });
      const text = await res.text();
      let json: { error?: string } & Record<string, unknown>;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`data.gov.in ${res.status}: non-JSON response`);
      }
      if (json.error) {
        if (/not authori[sz]ed/i.test(json.error)) throw new DataGovAuthError();
        throw new Error(`data.gov.in: ${json.error}`);
      }
      if (res.status === 429 || res.status >= 500) throw new Error(`data.gov.in HTTP ${res.status}`);
      return json as T;
    } catch (e) {
      if (e instanceof DataGovAuthError) throw e;
      lastErr = e;
      await new Promise((r) => setTimeout(r, 800 * 2 ** i));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("data.gov.in request failed");
}

interface RawCatalog {
  total: number;
  records: {
    index_name: string;
    title: string;
    desc?: string;
    org?: string[];
    sector?: string[];
    org_type?: string;
    catalog_uuid?: string;
    created?: number;
    updated?: number;
    active?: string | number;
    field?: { id: string; name: string; type: string }[];
  }[];
}

export async function searchCatalog(q: CatalogQuery = {}): Promise<{ total: number; entries: CatalogEntry[] }> {
  const raw = await getJson<RawCatalog>("/lists", {
    "filters[active]": 1,
    "filters[title]": q.title,
    "filters[sector]": q.sector,
    "filters[org]": q.org,
    offset: q.offset ?? 0,
    limit: q.limit ?? 100,
  });
  return {
    total: raw.total,
    entries: (raw.records ?? []).map((r) => ({
      id: r.index_name,
      title: r.title,
      description: r.desc ?? null,
      org: r.org ?? [],
      sector: r.sector ?? [],
      orgType: r.org_type ?? null,
      catalogId: r.catalog_uuid ?? null,
      fields: r.field ?? [],
      createdAt: r.created ?? null,
      updatedAt: r.updated ?? null,
      active: String(r.active ?? "1") === "1",
    })),
  };
}

export interface ResourcePage {
  total: number;
  count: number;
  updated: number | null;
  title: string | null;
  fields: { id: string; name: string; type: string }[];
  records: Record<string, string>[];
}

interface RawResource {
  total: number;
  count: number;
  updated?: number;
  title?: string;
  field?: { id: string; name: string; type: string }[];
  records?: Record<string, string>[];
}

/** One page of rows. `filters` map to `filters[field]=value` (e.g. state, commodity, date). */
export async function fetchResourcePage(
  id: string,
  opts: { offset?: number; limit?: number; filters?: Record<string, string>; sortBy?: string; sortDir?: "asc" | "desc" } = {},
): Promise<ResourcePage> {
  const params: Record<string, string | number | undefined> = { offset: opts.offset ?? 0, limit: Math.min(opts.limit ?? 1000, 1000) };
  for (const [k, v] of Object.entries(opts.filters ?? {})) params[`filters[${k}]`] = v;
  if (opts.sortBy) params[`sort[${opts.sortBy}]`] = opts.sortDir ?? "desc";
  const raw = await getJson<RawResource>(`/resource/${id}`, params);
  return {
    total: Number(raw.total ?? 0),
    count: Number(raw.count ?? raw.records?.length ?? 0),
    updated: raw.updated ?? null,
    title: raw.title ?? null,
    fields: raw.field ?? [],
    records: raw.records ?? [],
  };
}

/** Stream every row of a resource (full history), page by page. */
export async function* iterateResource(
  id: string,
  opts: { pageSize?: number; maxRows?: number; startOffset?: number; filters?: Record<string, string> } = {},
): AsyncGenerator<{ records: Record<string, string>[]; offset: number; total: number }> {
  const pageSize = Math.min(opts.pageSize ?? 1000, 1000);
  let offset = opts.startOffset ?? 0;
  const cap = opts.maxRows ?? Infinity;
  while (offset < cap) {
    const page = await fetchResourcePage(id, { offset, limit: Math.min(pageSize, cap - offset), filters: opts.filters });
    if (!page.records.length) return;
    yield { records: page.records, offset, total: page.total };
    offset += page.records.length;
    if (offset >= page.total) return;
  }
}

/** Curated resource UUIDs (data.gov.in only accepts UUIDs, not slugs). Newest release first. */
export const RESOURCES = {
  /** Wholesale Price Index (Base 2011-12), wide format: COMM_NAME + INDXMMYYYY columns. */
  wpi: ["239ac3d0-f08d-40d0-b03c-9b7a426a62d5"],
  /** All India CPI (Rural/Urban/Combined) by month with group columns + general_index. */
  cpi: ["1ca957b4-0cf0-4d7e-a6a7-627d9f13b170", "2a6edbfb-b416-48db-9183-645be023f757"],
} as const;

/** Rows for a resource, or [] on any failure (macro panels degrade to their fallbacks). */
export async function safeRecords(id: string, limit = 1000): Promise<Record<string, string>[]> {
  try {
    return (await fetchResourcePage(id, { limit })).records;
  } catch {
    return [];
  }
}
