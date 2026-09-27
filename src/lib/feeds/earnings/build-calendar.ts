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

/** Approx Nifty 50 index weights (illustrative until live index file wired). */
const NIFTY_WEIGHT: Record<string, string> = {
  HDFCBANK: "11.2%",
  RELIANCE: "9.4%",
  TCS: "7.8%",
  INFY: "5.6%",
  BAJFINANCE: "4.5%",
  ASIANPAINT: "3.1%",
};

/** Prior reported quarter — not live consensus; label in UI. */
const PRIOR_QUARTER: Record<
  string,
  { lastRevenue: string; eps: string; previousSurprise: string; expectedResult: string; asOfQuarter: string }
> = {
  TCS: {
    lastRevenue: "₹64,259 Cr",
    eps: "₹33.20",
    previousSurprise: "+2.4%",
    expectedResult: "See exchange filing / research",
    asOfQuarter: "Q1 FY26 reported",
  },
  RELIANCE: {
    lastRevenue: "₹2,35,481 Cr",
    eps: "₹28.40",
    previousSurprise: "+1.8%",
    expectedResult: "See exchange filing / research",
    asOfQuarter: "Q1 FY26 reported",
  },
  HDFCBANK: {
    lastRevenue: "₹85,182 Cr",
    eps: "₹21.60",
    previousSurprise: "+3.2%",
    expectedResult: "See exchange filing / research",
    asOfQuarter: "Q1 FY26 reported",
  },
  INFY: {
    lastRevenue: "₹40,986 Cr",
    eps: "₹15.80",
    previousSurprise: "+0.9%",
    expectedResult: "See exchange filing / research",
    asOfQuarter: "Q1 FY26 reported",
  },
  ASIANPAINT: {
    lastRevenue: "₹9,103 Cr",
    eps: "₹12.40",
    previousSurprise: "-1.5%",
    expectedResult: "See exchange filing / research",
    asOfQuarter: "Q1 FY26 reported",
  },
  BAJFINANCE: {
    lastRevenue: "₹14,928 Cr",
    eps: "₹58.10",
    previousSurprise: "+4.1%",
    expectedResult: "See exchange filing / research",
    asOfQuarter: "Q1 FY26 reported",
  },
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
  const snap = PRIOR_QUARTER[row.symbol];
  return {
    id: `${row.symbol}-${row.date}`,
    company: row.name,
    symbol: row.symbol,
    date: row.date,
    period,
    timing: timingLabel(row.isEstimate),
    lastRevenue: snap?.lastRevenue ?? null,
    eps: snap?.eps ?? null,
    previousSurprise: snap?.previousSurprise ?? null,
    expectedResult: snap?.expectedResult ?? "Open research desk for estimates",
    portfolioWeight: NIFTY_WEIGHT[row.symbol] ?? null,
    sourceUrl: "https://www.bseindia.com/corporates/ann.html",
    isEstimate: row.isEstimate,
  };
}

export async function buildEarningsCalendarPanel() {
  const { asOf, rows, failed } = await loadEarningsRows(false);
  const items: EarningsCalendarItem[] = [];
  for (const row of rows) {
    const period = earningsPeriod(row.date);
    if (!period) continue;
    items.push(toItem(row, period));
  }
  return {
    asOf,
    failed,
    source: "Yahoo Finance calendarEvents (6h cache)",
    priorQuarterNote: "Last Rev / EPS / Surprise = prior reported quarter where noted — not live consensus.",
    items,
  };
}
