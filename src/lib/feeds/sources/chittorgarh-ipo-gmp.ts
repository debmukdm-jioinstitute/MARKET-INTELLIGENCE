import { feedFetch } from "@/lib/feeds/http";
import { compactToken } from "@/lib/feeds/symbol-normalize";
import type { IpoGmpQuote } from "@/lib/feeds/sources/ipowatch-gmp";

/** Linked from Chittorgarh IPO dashboard as live GMP partner. */
const GMP_URL = "https://www.investorgain.com/report/ipo-gmp-live/331/";
const DASHBOARD_URL = "https://www.chittorgarh.com/ipo/ipo_dashboard.asp";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; MarketIntelligenceBot/1.0; +https://getmarketintelligence.in)",
  Accept: "text/html,application/xhtml+xml",
};

let cache: { at: number; rows: IpoGmpQuote[] } | null = null;
const TTL_MS = 15 * 60_000;

function parseInr(raw: string): number | null {
  const cleaned = raw
    .replace(/&#8377;|₹/g, "")
    .replace(/[,\s]/g, "")
    .replace(/[^\d.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned.toLowerCase() === "na") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parsePct(raw: string): number | null {
  const m = raw.match(/\(([+-]?\d+(?:\.\d+)?)\s*%\)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

function decodeHtml(text: string): string {
  return text
    .replace(/&#8377;/g, "₹")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—");
}

function cellByLabel(rowHtml: string, label: string): string {
  const re = new RegExp(
    `data-label="${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>[\\s\\S]*?<div class="mono-num">([\\s\\S]*?)</div>`,
    "i",
  );
  const m = rowHtml.match(re);
  return m ? decodeHtml(stripTags(m[1]!)) : "";
}

function mapBadgeToStatus(badge: string): string | null {
  switch (badge.toUpperCase()) {
    case "O":
    case "CT":
      return "Open";
    case "U":
      return "Upcoming";
    case "P":
      return "Closed";
    case "LT":
      return "Listing Today";
    default:
      return null;
  }
}

function parseStatusFromRow(rowHtml: string): string | null {
  const badges = [...rowHtml.matchAll(/badge rounded-pill[^>]*>([A-Z]{1,3})</gi)].map((m) => m[1]!);
  for (const b of badges) {
    if (b === "IPO" || b === "SME") continue;
    const mapped = mapBadgeToStatus(b);
    if (mapped) return mapped;
  }
  return null;
}

function slugKeywords(rowHtml: string): string[] {
  const href = rowHtml.match(/href="\/gmp\/([^"?#/]+)/i)?.[1];
  if (!href) return [];
  return href
    .split("-")
    .map((p) => p.trim())
    .filter((p) => p.length >= 3 && p !== "ipo" && p !== "gmp");
}

function parseNameFromRow(rowHtml: string): string {
  const m = rowHtml.match(/<a[^>]+title="([^"]+)"[^>]*>/i);
  if (m?.[1]?.trim()) return m[1].trim();
  const cell = cellByLabel(rowHtml, "Name");
  return cell.replace(/\s+(IPO|BSE SME|NSE SME).*$/i, "").trim();
}

export function parseInvestorGainGmpTable(html: string): IpoGmpQuote[] {
  const asOf = new Date().toISOString();
  const source = { provider: "Chittorgarh", url: DASHBOARD_URL, asOf };
  const body = html.match(/<tbody id="tableBody">([\s\S]*?)<\/tbody>/i)?.[1] ?? "";
  const rows = body.match(/<tr>[\s\S]*?<\/tr>/gi) ?? [];
  const out: IpoGmpQuote[] = [];

  for (const row of rows) {
    const name = parseNameFromRow(row);
    if (!name) continue;

    const gmpRaw = cellByLabel(row, "GMP");
    const gmpInr = parseInr(gmpRaw.split("(")[0] ?? gmpRaw);
    if (gmpInr != null && (gmpInr < -5000 || gmpInr > 50_000)) continue;

    const priceRaw = cellByLabel(row, "Price (₹)") || cellByLabel(row, "Price");
    const priceBandInr = parseInr(priceRaw);
    const estListingGainPct =
      parsePct(gmpRaw) ??
      (gmpInr != null && priceBandInr != null && priceBandInr > 0
        ? Math.round((gmpInr / priceBandInr) * 10000) / 100
        : null);
    const estListingInr =
      gmpInr != null && priceBandInr != null ? priceBandInr + gmpInr : priceBandInr;

    const open = cellByLabel(row, "Open");
    const close = cellByLabel(row, "Close");
    const dateWindow =
      open && close ? `${open} - ${close}` : open || close || null;

    out.push({
      name,
      matchKeywords: slugKeywords(row),
      gmpInr,
      priceBandInr,
      estListingInr: estListingInr ?? null,
      estListingGainPct,
      dateWindow,
      status: parseStatusFromRow(row),
      source,
    });
  }

  const seen = new Set<string>();
  const deduped: IpoGmpQuote[] = [];
  for (const row of out) {
    const key = compactToken(row.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }
  return deduped;
}

type DashboardHint = { dateWindow: string | null; status: string | null };

export function parseChittorgarhDashboardHints(html: string): Map<string, DashboardHint> {
  const hints = new Map<string, DashboardHint>();
  const tableMatch = html.match(
    /Mainboard IPOs &amp; FPOs[\s\S]*?<table class="table[\s\S]*?<\/table>/i,
  );
  if (!tableMatch) return hints;
  const rowRe =
    /<tr class="([^"]*)">[\s\S]*?title="([^"]+)"[\s\S]*?<span class="float-end ms-2">([^<]+)<\/span>/gi;
  for (const m of tableMatch[0].matchAll(rowRe)) {
    const rowClass = m[1] ?? "";
    const name = decodeHtml(m[2]!.trim());
    const dateWindow = m[3]?.trim() ?? null;
    let status: string | null = null;
    if (/color-green/i.test(rowClass)) status = "Open";
    else if (/color-lightyellow/i.test(rowClass)) status = "Closed";
    else if (/color-aqua/i.test(rowClass)) status = "Listing Today";
    const key = compactToken(name);
    if (key) hints.set(key, { dateWindow, status });
  }
  return hints;
}

function applyDashboardHints(rows: IpoGmpQuote[], hints: Map<string, DashboardHint>): IpoGmpQuote[] {
  if (!hints.size) return rows;
  return rows.map((row) => {
    const hint = hints.get(compactToken(row.name));
    if (!hint) return row;
    return {
      ...row,
      dateWindow: row.dateWindow ?? hint.dateWindow,
      status: row.status ?? hint.status,
    };
  });
}

/** GMP + calendar hints from Chittorgarh ecosystem (dashboard + linked live GMP table). */
export async function fetchChittorgarhIpoGmp(): Promise<IpoGmpQuote[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  try {
    const [gmpRes, dashRes] = await Promise.all([
      feedFetch(GMP_URL, { headers: BROWSER_HEADERS, timeoutMs: 15_000 }),
      feedFetch(DASHBOARD_URL, { headers: BROWSER_HEADERS, timeoutMs: 15_000 }),
    ]);
    if (!gmpRes.ok) return cache?.rows ?? [];
    const gmpHtml = await gmpRes.text();
    let rows = parseInvestorGainGmpTable(gmpHtml);
    if (dashRes.ok) {
      const dashHtml = await dashRes.text();
      rows = applyDashboardHints(rows, parseChittorgarhDashboardHints(dashHtml));
    }
    if (rows.length) cache = { at: Date.now(), rows };
    return rows.length ? rows : (cache?.rows ?? []);
  } catch {
    return cache?.rows ?? [];
  }
}
