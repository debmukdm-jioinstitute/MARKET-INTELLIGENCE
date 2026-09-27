import { feedFetch } from "@/lib/feeds/http";

const NSE_INDEX_CSV_BASE = "https://archives.nseindia.com/content/indices/";

const ARCHIVE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/csv,text/plain,*/*",
  Referer: "https://www.nseindia.com/",
};

/** Parse NSE index constituent CSV (Company, Industry, Symbol, Series, ISIN). */
export function parseNseIndexConstituentCsv(text: string): string[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const symbols: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(",");
    const sym = (parts.length >= 3 ? parts[2] : parts[parts.length - 3])?.trim().toUpperCase();
    if (sym && /^[A-Z0-9&-]+$/.test(sym)) symbols.push(sym);
  }
  return [...new Set(symbols)];
}

export async function fetchNseIndexConstituentSymbols(csvFile: string): Promise<string[]> {
  const url = `${NSE_INDEX_CSV_BASE}${csvFile}`;
  const res = await feedFetch(url, { headers: ARCHIVE_HEADERS, timeoutMs: 30_000 });
  if (!res.ok) throw new Error(`NSE index CSV ${csvFile} HTTP ${res.status}`);
  const text = await res.text();
  if (text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html")) {
    throw new Error(`NSE index CSV ${csvFile} returned HTML`);
  }
  const symbols = parseNseIndexConstituentCsv(text);
  if (!symbols.length) throw new Error(`NSE index CSV ${csvFile} had no symbols`);
  return symbols;
}

export function nseIndexConstituentSourceUrl(csvFile: string): string {
  return `${NSE_INDEX_CSV_BASE}${csvFile}`;
}
