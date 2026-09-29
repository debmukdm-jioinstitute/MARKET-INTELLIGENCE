import { feedFetch } from "@/lib/feeds/http";
import type { OfferCategory, OfferReport, OfferRow, OfferSource } from "@/lib/feeds/offers/types";

const API_BASE = "https://webnodejs.chittorgarh.com/cloud/report/data-read";
const SITE = "https://www.chittorgarh.com";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; MarketIntelligenceBot/1.0; +https://getmarketintelligence.in)",
  Accept: "application/json",
};

type ReportDef = {
  id: number;
  title: string;
  pagePath: string;
  nameKeys: string[];
  detailPath?: (slug: string, id: number) => string;
};

export const CHITTORGARH_OFFER_REPORTS: Record<OfferCategory, ReportDef> = {
  ncd: {
    id: 27,
    title: "NCD issues",
    pagePath: "/report/latest-ncd-issue-in-india/27/",
    nameKeys: ["Company", "Company Name"],
    detailPath: (slug, id) => `/ncd/${slug}/${id}/`,
  },
  rights: {
    id: 75,
    title: "Rights issues",
    pagePath: "/report/latest-rights-issue-in-india/75/",
    nameKeys: ["Company Name", "Company"],
    detailPath: (slug, id) => `/rights-issue/${slug}/${id}/`,
  },
  buyback: {
    id: 80,
    title: "Buybacks",
    pagePath: "/report/latest-buyback-issues-in-india/80/tender-offer-buyback/",
    nameKeys: ["Company Name", "Company"],
  },
  ofs: {
    id: 157,
    title: "Offer for sale (OFS)",
    pagePath: "/report/offer-for-sale-in-india/157/",
    nameKeys: ["Company Name", "Company"],
  },
  "ncd-subscription": {
    id: 90,
    title: "NCD subscription (live)",
    pagePath: "/report/ncd-subscription-status-live-bidding-data-bse-nse/90/",
    nameKeys: ["Company Name", "Company"],
  },
};

const cache = new Map<string, { at: number; report: OfferReport }>();
const TTL_MS = 15 * 60_000;

function fiscalYearSpan(calendarYear: number): string {
  return `${calendarYear}-${String(calendarYear + 1).slice(-2)}`;
}

function stripHtml(raw: string): string {
  return raw.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

function pickName(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return stripHtml(v);
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return "—";
}

function normalizeFieldValue(value: unknown): string | number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return stripHtml(value) || null;
  return String(value);
}

export function parseChittorgarhReportPayload(
  category: OfferCategory,
  payload: unknown,
  year: number,
): OfferReport {
  const def = CHITTORGARH_OFFER_REPORTS[category];
  const pageUrl = `${SITE}${def.pagePath}?year=${year}`;
  const asOf = new Date().toISOString();
  const source: OfferSource = { provider: "Chittorgarh", url: pageUrl, asOf };

  const rawRows = (
    payload && typeof payload === "object" && "reportTableData" in payload
      ? (payload as { reportTableData?: unknown }).reportTableData
      : null
  ) as Record<string, unknown>[] | null;

  const rows: OfferRow[] = [];
  for (const raw of rawRows ?? []) {
    const recordId = raw["~id"];
    const slug = typeof raw["~URLRewrite_Folder_Name"] === "string" ? raw["~URLRewrite_Folder_Name"] : "";
    const id =
      typeof recordId === "number" || typeof recordId === "string"
        ? String(recordId)
        : `${category}-${rows.length}`;
    const name = pickName(raw, def.nameKeys);
    const fields: Record<string, string | number | null> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (key.startsWith("~")) continue;
      fields[key] = normalizeFieldValue(value);
    }
    const detailUrl =
      def.detailPath && slug && recordId != null
        ? `${SITE}${def.detailPath(slug, Number(recordId))}`
        : null;
    rows.push({
      id: `${category}-${id}`,
      name,
      category,
      statusHint: typeof raw["~Highlight_Row"] === "string" ? raw["~Highlight_Row"] : null,
      fields,
      detailUrl,
      source,
    });
  }

  return { category, title: def.title, year, rows, source };
}

export async function fetchChittorgarhOfferReport(
  category: OfferCategory,
  year = new Date().getFullYear(),
): Promise<OfferReport> {
  const def = CHITTORGARH_OFFER_REPORTS[category];
  const cacheKey = `${category}:${year}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.report;

  const url = `${API_BASE}/${def.id}/1/9/${year}/${fiscalYearSpan(year)}/0/0/0?search=`;
  try {
    const res = await feedFetch(url, { headers: BROWSER_HEADERS, timeoutMs: 20_000 });
    if (!res.ok) return hit?.report ?? emptyReport(category, year);
    const payload = (await res.json()) as unknown;
    const report = parseChittorgarhReportPayload(category, payload, year);
    if (report.rows.length) cache.set(cacheKey, { at: Date.now(), report });
    return report.rows.length ? report : (hit?.report ?? report);
  } catch {
    return hit?.report ?? emptyReport(category, year);
  }
}

function emptyReport(category: OfferCategory, year: number): OfferReport {
  const def = CHITTORGARH_OFFER_REPORTS[category];
  const pageUrl = `${SITE}${def.pagePath}?year=${year}`;
  return {
    category,
    title: def.title,
    year,
    rows: [],
    source: { provider: "Chittorgarh", url: pageUrl, asOf: new Date().toISOString() },
  };
}

export async function fetchAllChittorgarhOffers(year?: number): Promise<OfferReport[]> {
  const categories = Object.keys(CHITTORGARH_OFFER_REPORTS) as OfferCategory[];
  return Promise.all(categories.map((c) => fetchChittorgarhOfferReport(c, year)));
}
