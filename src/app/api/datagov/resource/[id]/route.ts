import { NextResponse } from "next/server";
import { DataGovAuthError, fetchResourcePage } from "@/lib/datagov/client";
import { hasDatabase, sql } from "@/lib/db";
import { ensureDataGovSchema } from "@/lib/datagov/store";

export const dynamic = "force-dynamic";

const ID = /^[0-9a-f-]{36}$/i;

/**
 * GET /api/datagov/resource/{uuid}?source=live|stored&offset=&limit=&filters[state]=…
 *  live   → straight from data.gov.in (latest values)
 *  stored → our mirror in Postgres (full history, no upstream call). Default: stored if the mirror has rows, else live.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ID.test(id)) return NextResponse.json({ error: "bad resource id" }, { status: 400 });
  const sp = new URL(req.url).searchParams;
  const offset = Math.max(Number(sp.get("offset") ?? 0) || 0, 0);
  const limit = Math.min(Math.max(Number(sp.get("limit") ?? 100) || 100, 1), 1000);
  const want = sp.get("source");

  if (hasDatabase() && want !== "live") {
    try {
      await ensureDataGovSchema();
      const db = sql();
      const [meta] = await db`SELECT title, fields, rows_synced, source_total, last_synced_at FROM datagov_datasets WHERE id = ${id}`;
      if (meta && Number(meta.rows_synced) > 0) {
        const rows = await db`SELECT data FROM datagov_records WHERE dataset_id = ${id} ORDER BY first_seen, row_hash OFFSET ${offset} LIMIT ${limit}`;
        return NextResponse.json({ source: "stored", meta, records: rows.map((r) => r.data) });
      }
    } catch {
      /* fall through to live */
    }
  }

  const filters: Record<string, string> = {};
  for (const [k, v] of sp) {
    const m = /^filters\[(.+)\]$/.exec(k);
    if (m) filters[m[1]!] = v;
  }
  try {
    const page = await fetchResourcePage(id, { offset, limit, filters });
    return NextResponse.json({ source: "live", ...page }, { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=1800" } });
  } catch (e) {
    const auth = e instanceof DataGovAuthError;
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed", needsKey: auth }, { status: auth ? 503 : 502 });
  }
}
