import { NextResponse } from "next/server";
import { buildRbiTables } from "@/lib/ts-charts/tipsheet-rbi";

export const revalidate = 3600;

/** GET /api/rbi/tables — MPC decisions, rate pass-through, bank credit by sector, dated G-sec auctions, SDL borrowing by state. */
export async function GET() {
  try {
    return NextResponse.json(await buildRbiTables(), { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "tables failed" }, { status: 503 });
  }
}
