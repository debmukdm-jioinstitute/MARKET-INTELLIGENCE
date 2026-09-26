import { fetchDataPage } from "@/lib/data360/client";
import { data360RefAreas } from "@/lib/data360/config";
import { ensureData360Schema } from "@/lib/data360/store";
import { syncStatus } from "@/lib/data360/sync";
import { hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/data360 — mirror status
 * GET /api/data360?database=WB_WDI&indicator=...&ref_area=IND&limit=100 — stored rows
 * GET /api/data360?live=1&database=...&indicator=... — passthrough to Data360 API (small pages)
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const database = sp.get("database") ?? sp.get("DATABASE_ID");
  const indicator = sp.get("indicator") ?? sp.get("INDICATOR");
  const refArea = sp.get("ref_area") ?? sp.get("REF_AREA") ?? undefined;

  if (sp.get("live") === "1") {
    if (!database || !indicator) {
      return NextResponse.json({ error: "database and indicator required for live=1" }, { status: 400 });
    }
    const page = await fetchDataPage({
      databaseId: database,
      indicator,
      refArea,
      skip: Number(sp.get("skip") ?? 0) || 0,
      top: Math.min(Number(sp.get("limit") ?? 100) || 100, 1000),
    });
    return NextResponse.json(page, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=3600" },
    });
  }

  const list = sp.get("list");

  if (!hasDatabase()) {
    if (list || database || indicator) {
      return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
    }
    return NextResponse.json({
      ok: false,
      error: "DATABASE_URL not configured",
      docs: "https://data360.worldbank.org/en/api",
    });
  }

  await ensureData360Schema();
  const db = sql();

  if (list === "datasets") {
    const rows = await db`
      SELECT database_id, series_count, indicators_cataloged, last_catalog_at, last_error
      FROM data360_datasets
      ORDER BY database_id
    `;
    return NextResponse.json({ datasets: rows, refAreas: data360RefAreas() });
  }

  if (database && list === "indicators") {
    const q = sp.get("q")?.trim() ?? "";
    const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
    const pageSize = Math.min(Math.max(1, Number(sp.get("limit") ?? 50) || 50), 200);
    const pattern = q ? `%${q.replace(/%/g, "")}%` : null;
    const [countRow] = pattern
      ? await db`
          SELECT count(*)::int AS n FROM data360_indicators
          WHERE database_id = ${database} AND tracked AND indicator_id ILIKE ${pattern}
        `
      : await db`
          SELECT count(*)::int AS n FROM data360_indicators
          WHERE database_id = ${database} AND tracked
        `;
    const rows = pattern
      ? await db`
          SELECT i.indicator_id, i.complete, i.obs_synced, i.last_synced_at,
            (SELECT count(*)::int FROM data360_observations o
             WHERE o.database_id = i.database_id AND o.indicator_id = i.indicator_id) AS obs_stored
          FROM data360_indicators i
          WHERE i.database_id = ${database} AND i.tracked AND i.indicator_id ILIKE ${pattern}
          ORDER BY i.indicator_id
          OFFSET ${offset} LIMIT ${pageSize}
        `
      : await db`
          SELECT i.indicator_id, i.complete, i.obs_synced, i.last_synced_at,
            (SELECT count(*)::int FROM data360_observations o
             WHERE o.database_id = i.database_id AND o.indicator_id = i.indicator_id) AS obs_stored
          FROM data360_indicators i
          WHERE i.database_id = ${database} AND i.tracked
          ORDER BY i.indicator_id
          OFFSET ${offset} LIMIT ${pageSize}
        `;
    return NextResponse.json({
      database,
      q: q || null,
      total: countRow?.n ?? 0,
      offset,
      limit: pageSize,
      indicators: rows,
    });
  }

  if (!database && !indicator && !list) {
    const status = await syncStatus();
    const log = await sql()`
      SELECT database_id, indicator_id, kind, ok, rows, error, ran_at
      FROM data360_sync_log ORDER BY ran_at DESC LIMIT 10
    `;
    return NextResponse.json({ ok: true, status, recentSyncs: log });
  }

  const limit = Math.min(Number(sp.get("limit") ?? 200) || 200, 2000);

  if (database && indicator) {
    const allowed = data360RefAreas();
    const area = refArea?.toUpperCase();
    if (area && !allowed.includes(area)) {
      return NextResponse.json({ error: `ref_area must be one of: ${allowed.join(", ")}` }, { status: 400 });
    }
    const rows = area
      ? await db`
          SELECT ref_area, time_period, obs_value, unit_measure, freq, payload
          FROM data360_observations
          WHERE database_id = ${database} AND indicator_id = ${indicator} AND ref_area = ${area}
          ORDER BY time_period DESC
          LIMIT ${limit}
        `
      : await db`
          SELECT ref_area, time_period, obs_value, unit_measure, freq, payload
          FROM data360_observations
          WHERE database_id = ${database} AND indicator_id = ${indicator} AND ref_area = ANY(${allowed}::text[])
          ORDER BY time_period DESC, ref_area
          LIMIT ${limit}
        `;
    return NextResponse.json({ database, indicator, refAreas: area ? [area] : allowed, count: rows.length, rows });
  }

  return NextResponse.json({ error: "Provide database+indicator, or omit for status" }, { status: 400 });
}
