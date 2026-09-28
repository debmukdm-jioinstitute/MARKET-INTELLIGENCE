import { hasDatabase, sql } from "@/lib/db";
import { ensureCollectorSchema, saveSeries } from "@/lib/collector/store";
import type { SeriesResult } from "@/lib/collector/types";

const FII_ID = "nse_fii_net_cash_cr";
const DII_ID = "nse_dii_net_cash_cr";
const NSE_FII_URL = "https://www.nseindia.com/api/fiidiiTradeReact";
const NSE_REPORT = "https://www.nseindia.com/reports/fii-dii";

const MONTHS: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

export function fiiDiiTradeDateToIso(date?: string): string | null {
  if (!date) return null;
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(date.trim());
  if (!m) return null;
  const mon = MONTHS[m[2]!];
  if (!mon) return null;
  return `${m[3]}-${mon}-${m[1]!.padStart(2, "0")}`;
}

type FiiDiiRow = { category: string; date?: string; netValue: string };

function parseNetCr(netValue?: string): number | null {
  if (!netValue) return null;
  const n = Number(netValue.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function fiiDiiRowsToSeries(rows: FiiDiiRow[]): SeriesResult[] {
  if (!rows.length) return [];
  const fiiRow = rows.find((r) => r.category.toUpperCase().includes("FII"));
  const diiRow = rows.find((r) => r.category.toUpperCase().includes("DII"));
  const iso = fiiDiiTradeDateToIso(fiiRow?.date ?? diiRow?.date);
  const fiiNet = parseNetCr(fiiRow?.netValue);
  const diiNet = parseNetCr(diiRow?.netValue);
  if (!iso || (fiiNet == null && diiNet == null)) return [];

  const base = {
    unit: "₹ cr net",
    category: "market" as const,
    provider: "NSE India (FII/DII daily report)",
    url: NSE_FII_URL,
  };
  const batch: SeriesResult[] = [];
  if (fiiNet != null) {
    batch.push({ ...base, id: FII_ID, label: "FII net cash market flow (NSE)", obs: [{ date: iso, value: fiiNet }] });
  }
  if (diiNet != null) {
    batch.push({ ...base, id: DII_ID, label: "DII net cash market flow (NSE)", obs: [{ date: iso, value: diiNet }] });
  }
  return batch;
}

/** Upsert today's NSE FII/DII net cash (₹ Cr) into collector tables for rollups. */
export async function persistFiiDiiRows(rows: FiiDiiRow[]): Promise<void> {
  if (!hasDatabase()) return;
  const batch = fiiDiiRowsToSeries(rows);
  for (const s of batch) await saveSeries(s);
}

export type FlowRollups = { d5: number | null; m1: number | null; ytd: number | null };

async function sumLastObs(seriesId: string, count: number): Promise<number | null> {
  if (!hasDatabase() || count < 1) return null;
  try {
    await ensureCollectorSchema();
    const rows = (await sql()`
      SELECT value FROM collected_obs
      WHERE series_id = ${seriesId}
      ORDER BY obs_date DESC
      LIMIT ${count}
    `) as { value: number }[];
    if (rows.length < count) return null;
    return rows.reduce((a, r) => a + Number(r.value), 0);
  } catch {
    return null;
  }
}

async function sumSince(seriesId: string, sinceIso: string): Promise<number | null> {
  if (!hasDatabase()) return null;
  try {
    await ensureCollectorSchema();
    const rows = (await sql()`
      SELECT value FROM collected_obs
      WHERE series_id = ${seriesId} AND obs_date >= ${sinceIso}::date
      ORDER BY obs_date ASC
    `) as { value: number }[];
    if (!rows.length) return null;
    return rows.reduce((a, r) => a + Number(r.value), 0);
  } catch {
    return null;
  }
}

export async function rollupFiiDiiFromStore(): Promise<{ fii: FlowRollups; dii: FlowRollups }> {
  const year = new Date().getFullYear();
  const ytdSince = `${year}-01-01`;
  const [fiiD5, fiiM1, fiiYtd, diiD5, diiM1, diiYtd] = await Promise.all([
    sumLastObs(FII_ID, 5),
    sumLastObs(FII_ID, 22),
    sumSince(FII_ID, ytdSince),
    sumLastObs(DII_ID, 5),
    sumLastObs(DII_ID, 22),
    sumSince(DII_ID, ytdSince),
  ]);
  return {
    fii: { d5: fiiD5, m1: fiiM1, ytd: fiiYtd },
    dii: { d5: diiD5, m1: diiM1, ytd: diiYtd },
  };
}

export { NSE_REPORT as NSE_FII_DII_REPORT_URL };
