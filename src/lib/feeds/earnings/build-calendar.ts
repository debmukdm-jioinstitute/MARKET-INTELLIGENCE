import type { EarningsRow } from "@/lib/feeds/earnings/load-earnings";
import { loadEarningsRows } from "@/lib/feeds/earnings/load-earnings";

export type EarningsCalendarPeriod = "TODAY" | "TOMORROW" | "THIS WEEK";

export type EarningsCalendarItem = {
  id: string;
  company: string;
  symbol: string;
  date: string;
  period: EarningsCalendarPeriod;
  timing: string;
  lastRevenue: string | null;
  eps: string | null;
  previousSurprise: string | null;
  expectedResult: string | null;
  portfolioWeight: string | null;
  sourceUrl: string;
  isEstimate: boolean;
};

const IST = "Asia/Kolkata";

function istDayKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: IST });
}

function parseDay(iso: string): number {
  const [y, m, day] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

/** 0 = today IST, 1 = tomorrow, 2–14 = this week bucket. Past dates hidden. */
export function earningsPeriod(isoDate: string, now = new Date()): EarningsCalendarPeriod | null {
  const diff = Math.round((parseDay(isoDate) - parseDay(istDayKey(now))) / 86_400_000);
  if (diff < 0) return null;
  if (diff === 0) return "TODAY";
  if (diff === 1) return "TOMORROW";
  if (diff <= 14) return "THIS WEEK";
  return null;
}

function timingLabel(isEstimate: boolean): string {
  return isEstimate ? "Date (estimate)" : "Scheduled date";
}

function toItem(row: EarningsRow, period: EarningsCalendarPeriod): EarningsCalendarItem {
  return {
    id: `${row.symbol}-${row.date}`,
    company: row.name,
    symbol: row.symbol,
    date: row.date,
    period,
    timing: timingLabel(row.isEstimate),
    // Prior-quarter figures and index weights are not in the calendar feed, so they are left empty rather than typed in.
    lastRevenue: null,
    eps: null,
    previousSurprise: null,
    expectedResult: "Open research desk for estimates",
    portfolioWeight: null,
    sourceUrl: `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(row.symbol)}`,
    isEstimate: row.isEstimate,
  };
}

export async function buildEarningsCalendarPanel() {
  const { asOf, rows, failed, scanned } = await loadEarningsRows(false);
  const items: EarningsCalendarItem[] = [];
  for (const row of rows) {
    const period = earningsPeriod(row.date);
    if (!period) continue;
    items.push(toItem(row, period));
  }
  items.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));
  return {
    asOf,
    failed,
    scanned,
    source: `Yahoo Finance calendarEvents · Nifty 500 universe (${scanned} names, 6h cache)`,
    priorQuarterNote: "",
    items,
  };
}
