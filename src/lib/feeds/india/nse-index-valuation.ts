import { feedFetch } from "@/lib/feeds/http";
import type { FieldSource, QuoteField } from "@/lib/feeds/india/types";

const ARCHIVE_BASE = "https://nsearchives.nseindia.com/content/indices/";
const REPORT_URL = "https://www.nseindia.com/reports-indices-historical-pepb";

const ARCHIVE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/csv,text/plain,*/*",
  Referer: "https://www.nseindia.com/",
};

export type NiftyIndexValuation = {
  pe: QuoteField;
  pb: QuoteField;
  divYield: QuoteField;
  indexDate: string | null;
};

const NSE_SOURCE: FieldSource = {
  provider: "NSE India (daily index close archive)",
  url: REPORT_URL,
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function archiveFileForDate(d: Date) {
  return `ind_close_all_${pad2(d.getDate())}${pad2(d.getMonth() + 1)}${d.getFullYear()}.csv`;
}

function parseNum(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === "" || raw.trim() === "-") return null;
  const n = Number(raw.trim());
  return Number.isFinite(n) ? n : null;
}

/** Parse Nifty 50 P/E, P/B, dividend yield from NSE `ind_close_all_DDMMYYYY.csv`. */
export function parseNifty50ValuationFromArchiveCsv(text: string): {
  pe: number | null;
  pb: number | null;
  divYield: number | null;
  indexDate: string | null;
} | null {
  if (text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html")) return null;
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return null;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;
    const cols = line.split(",");
    const name = cols[0]?.trim().toLowerCase() ?? "";
    if (!name.includes("nifty 50") || name.includes("next")) continue;
    const pe = parseNum(cols[10]);
    const pb = parseNum(cols[11]);
    const divYield = parseNum(cols[12]);
    const indexDate = cols[1]?.trim() || null;
    if (pe != null && (pe < 5 || pe > 80)) return null;
    if (pb != null && (pb < 0.2 || pb > 15)) return null;
    if (divYield != null && (divYield < 0 || divYield > 10)) return null;
    return { pe, pb, divYield, indexDate };
  }
  return null;
}

function quoteField(value: number | null, asOf: string | null): QuoteField {
  return {
    value,
    source: { ...NSE_SOURCE, asOf: asOf ?? undefined },
  };
}

/** Latest NIFTY 50 trailing P/E, P/B and index dividend yield from NSE index archives (walks back up to 12 calendar days). */
export async function fetchNifty50IndexValuation(): Promise<NiftyIndexValuation | null> {
  const today = new Date();
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const file = archiveFileForDate(d);
    const url = `${ARCHIVE_BASE}${file}`;
    try {
      const res = await feedFetch(url, { headers: ARCHIVE_HEADERS, timeoutMs: 25_000 });
      if (!res.ok) continue;
      const text = await res.text();
      const parsed = parseNifty50ValuationFromArchiveCsv(text);
      if (!parsed) continue;
      return {
        pe: quoteField(parsed.pe, parsed.indexDate),
        pb: quoteField(parsed.pb, parsed.indexDate),
        divYield: quoteField(parsed.divYield, parsed.indexDate),
        indexDate: parsed.indexDate,
      };
    } catch {
      /* try previous day */
    }
  }
  return null;
}
