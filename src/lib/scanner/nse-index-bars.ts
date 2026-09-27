import { feedFetch } from "@/lib/feeds/http";
import type { Bar } from "./types";

const ARCHIVE_BASE = "https://nsearchives.nseindia.com/content/indices/";
const ARCHIVE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/csv,text/plain,*/*",
  Referer: "https://www.nseindia.com/",
};

function archiveFileForDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `ind_close_all_${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}.csv`;
}

/** Parse one index row from NSE `ind_close_all_DDMMYYYY.csv` (case-insensitive name match). */
export function parseNseIndexRowFromArchiveCsv(
  text: string,
  indexName: string,
): { close: number; high: number; low: number; volume: number; date: string } | null {
  if (text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html")) return null;
  const want = indexName.trim().toLowerCase();
  for (const line of text.trim().split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split(",");
    const name = cols[0]?.trim().toLowerCase() ?? "";
    if (name !== want) continue;
    const close = Number(cols[5]);
    const high = Number(cols[3]);
    const low = Number(cols[4]);
    const volume = Number(cols[8]?.replace(/,/g, "") ?? 0);
    if (!Number.isFinite(close) || close <= 0) return null;
    return {
      close,
      high: Number.isFinite(high) ? high : close,
      low: Number.isFinite(low) ? low : close,
      volume: Number.isFinite(volume) ? volume : 0,
      date: cols[1]?.trim() ?? "",
    };
  }
  return null;
}

function parseArchiveDate(ddmmyyyy: string): number | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(ddmmyyyy.trim());
  if (!m) return null;
  return Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12, 0, 0) / 1000;
}

/** Daily OHLCV from NSE index close archives (for indices Yahoo does not chart well). */
export async function fetchNseArchiveIndexBars(indexCsvName: string, minBars = 600): Promise<Bar[] | null> {
  const bars: Bar[] = [];
  const seen = new Set<string>();
  const start = new Date();
  const maxCalendarDays = 1400;
  const concurrency = 24;

  for (let offset = 0; offset < maxCalendarDays && bars.length < minBars + 50; offset += concurrency) {
    const batch = await Promise.all(
      Array.from({ length: concurrency }, async (_, j) => {
        const day = new Date(start);
        day.setDate(start.getDate() - (offset + j));
        const file = archiveFileForDate(day);
        const url = `${ARCHIVE_BASE}${file}`;
        try {
          const res = await feedFetch(url, { headers: ARCHIVE_HEADERS, timeoutMs: 10_000 });
          if (!res.ok) return null;
          const row = parseNseIndexRowFromArchiveCsv(await res.text(), indexCsvName);
          if (!row || seen.has(row.date)) return null;
          const t = parseArchiveDate(row.date);
          if (t == null) return null;
          seen.add(row.date);
          return {
            t,
            o: row.close,
            h: row.high,
            l: row.low,
            c: row.close,
            v: row.volume,
          } satisfies Bar;
        } catch {
          return null;
        }
      }),
    );
    for (const b of batch) {
      if (b) bars.push(b);
    }
  }

  bars.sort((a, b) => a.t - b.t);
  return bars.length >= 260 ? bars : null;
}
