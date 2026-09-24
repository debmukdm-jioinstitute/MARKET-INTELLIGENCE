import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { classify } from "@/lib/collector/freshness";
import { collectorStatus, seriesHistory } from "@/lib/collector/store";

export const dynamic = "force-dynamic";

type Row = { id: string; last_ok: string | null; last_error: string | null; latest_date: string | null; [k: string]: unknown };

/** GET /api/collector → freshness of every collected series. GET ?id=rbi_repo → history. */
export async function GET(req: Request) {
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  try {
    if (id) return NextResponse.json({ id, points: await seriesHistory(id) });
    const rows = (await collectorStatus()) as unknown as Row[];
    const series = rows.filter((r) => !r.id.startsWith("collector:")).map((r) => ({ ...r, status: classify(r) }));
    const failures = rows.filter((r) => r.id.startsWith("collector:")).map((r) => ({ collector: r.id.slice(10), error: r.last_error, at: r.last_run }));
    const counts = { fresh: 0, stale: 0, failing: 0, pending: 0 };
    for (const s of series) counts[s.status]++;
    return NextResponse.json({ generatedAt: new Date().toISOString(), counts, series, failures }, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
