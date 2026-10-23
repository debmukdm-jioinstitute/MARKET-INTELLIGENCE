import { NextResponse } from "next/server";
import { hasDatabase, sql, toDateString } from "@/lib/db";
import { ensureTsSchema } from "@/lib/ts-charts/server";

export const dynamic = "force-dynamic";
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/ts/events?from=YYYY-MM-DD&to=YYYY-MM-DD[&kind=holiday,dividend] — NSE holidays and corporate actions. */
export async function GET(req: Request) {
  if (!hasDatabase()) return NextResponse.json([]);
  const u = new URL(req.url);
  const from = u.searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
  const to = u.searchParams.get("to") ?? new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);
  if (!DATE.test(from) || !DATE.test(to)) return NextResponse.json({ error: "from/to must be YYYY-MM-DD" }, { status: 400 });
  const kinds = (u.searchParams.get("kind") ?? "").split(",").map((k) => k.trim()).filter((k) => /^[a-z]+$/.test(k));
  try {
    await ensureTsSchema();
    const rows = (await sql()`
      SELECT id, kind, symbol, title, event_date FROM ts_events
      WHERE event_date BETWEEN ${from}::date AND ${to}::date AND (${kinds.length === 0} OR kind = ANY(${kinds}::text[]))
      ORDER BY event_date, kind, symbol LIMIT 500`) as unknown as { id: string; kind: string; symbol: string | null; title: string; event_date: unknown }[];
    return NextResponse.json(rows.map((r) => ({ ...r, event_date: toDateString(r.event_date) })), { headers: { "Cache-Control": "s-maxage=1800, stale-while-revalidate=86400" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "events failed" }, { status: 503 });
  }
}
