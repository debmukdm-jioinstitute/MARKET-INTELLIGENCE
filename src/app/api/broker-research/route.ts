import { NextResponse } from "next/server";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { mapResearchRow, type ApiResearchReport } from "@/lib/research/api-map";

export const revalidate = 900;

/**
 * GET /api/broker-research
 *
 * Serves REAL ingested broker research notes from the `research_reports`
 * table (populated by the research scrapers / ingest API). Query params:
 *   ?symbol=RELIANCE  filter by company symbol
 *   ?broker=Kotak     filter by broker name (ILIKE)
 *   ?limit=50         max rows (default 50, cap 200)
 *
 * Returns { success, reports, totalCount, dbConfigured }. When the database
 * is not configured or has no rows, reports is [] — the UI must show an
 * explicit "no research notes available" state, never invented data.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol")?.trim().toUpperCase() || null;
    const broker = searchParams.get("broker")?.trim() || null;
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50) || 50, 1), 200);

    if (!hasDatabase()) {
      return NextResponse.json({
        success: true,
        reports: [] as ApiResearchReport[],
        totalCount: 0,
        dbConfigured: false,
        note: "Database not configured — no research notes available.",
      });
    }

    await ensureSchema();
    const db = sql();

    const rows = await db`
      SELECT
        id, source, broker, title, url, pdf_url, symbol, recommendation,
        target_price, cmp, upside_pct, report_type, summary, published_at, scraped_at, extra
      FROM research_reports
      WHERE (${symbol}::text IS NULL OR symbol = ${symbol})
        AND (${broker}::text IS NULL OR broker ILIKE ${`%${broker ?? ""}%`})
      ORDER BY COALESCE(published_at, scraped_at) DESC
      LIMIT ${limit}
    `;

    const reports = rows.map((r) => mapResearchRow(r as Record<string, unknown>));

    return NextResponse.json({
      success: true,
      reports,
      totalCount: reports.length,
      dbConfigured: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        reports: [],
        totalCount: 0,
        error: error instanceof Error ? error.message : "Failed to fetch broker research",
      },
      { status: 500 }
    );
  }
}
