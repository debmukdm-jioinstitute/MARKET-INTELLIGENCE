import { NextResponse } from "next/server";
import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import { fetchYahooEarningsDate } from "@/lib/feeds/sources/yahoo-calendar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type EarningsRow = { symbol: string; name: string; date: string; isEstimate: boolean };

let cache: { at: number; rows: EarningsRow[]; failed: number } | null = null;

/** Next earnings date per tracked large cap (Yahoo Finance calendar). Only dates on file are returned — no financials. */
export async function GET() {
  if (!cache || Date.now() - cache.at > 6 * 3_600_000) {
    const results = await Promise.allSettled(INDIA_EQUITIES.map((i) => fetchYahooEarningsDate(i.symbol)));
    const rows: EarningsRow[] = [];
    let failed = 0;
    results.forEach((r, idx) => {
      if (r.status === "rejected") failed++;
      else if (r.value) rows.push({ symbol: INDIA_EQUITIES[idx].symbol, name: INDIA_EQUITIES[idx].name, date: r.value.date, isEstimate: r.value.isEstimate });
    });
    cache = { at: Date.now(), rows: rows.sort((a, b) => a.date.localeCompare(b.date)), failed };
  }
  return NextResponse.json({ asOf: new Date(cache.at).toISOString(), rows: cache.rows, failed: cache.failed, source: "Yahoo Finance calendar events" });
}
