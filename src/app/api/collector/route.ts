import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { collectorStatus, seriesHistory } from "@/lib/collector/store";

export const dynamic = "force-dynamic";

/** GET /api/collector → status of every collected series. GET ?id=rbi_repo → history. */
export async function GET(req: Request) {
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  try {
    if (id) return NextResponse.json({ id, points: await seriesHistory(id) });
    return NextResponse.json({ series: await collectorStatus() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
