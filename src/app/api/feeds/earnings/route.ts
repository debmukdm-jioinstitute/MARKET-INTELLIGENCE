import { loadEarningsRows, type EarningsRow } from "@/lib/feeds/earnings/load-earnings";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type { EarningsRow };

/** Next earnings date per tracked large cap (Yahoo Finance calendar). Only dates on file are returned — no financials. */
export async function GET() {
  const { asOf, rows, failed } = await loadEarningsRows(false);
  return NextResponse.json({ asOf, rows, failed, source: "Yahoo Finance calendar events" });
}
