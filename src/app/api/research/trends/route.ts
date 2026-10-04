import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const revalidate = 900;

const CACHE = "public, s-maxage=86400, stale-while-revalidate=3600"; // 24 hours — fetched weekly
const NOTE = "Google Trends is 0–100 relative interest, not absolute search volume.";

type Row = { keyword: string; topic_id: string | null; fetched_at: Date | string; series: { points?: { d: string; v: number }[]; momentum?: string | null; recentChangePct?: number | null; yearOnYearChangePct?: number | null } | null; rising_queries: string[] | null };

/** GET /api/research/trends?keyword=RELIANCE — latest weekly India interest series + rising related searches. */
export async function GET(req: Request) {
  const keyword = new URL(req.url).searchParams.get("keyword")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9&.\-]{1,20}$/.test(keyword)) return NextResponse.json({ error: "Missing or invalid keyword" }, { status: 400 });
  const empty = { keyword, note: NOTE, geo: "IN", series: null, risingQueries: [] as string[] };
  if (!hasDatabase()) return NextResponse.json({ ...empty, dbConfigured: false }, { headers: { "Cache-Control": CACHE } });
  try {
    await ensureSchema();
    const rows = (await sql()`SELECT keyword, topic_id, fetched_at, series, rising_queries FROM trend_series WHERE keyword = ${keyword} ORDER BY fetched_at DESC LIMIT 1`) as Row[];
    const r = rows[0];
    if (!r?.series?.points?.length) return NextResponse.json({ ...empty, dbConfigured: true }, { headers: { "Cache-Control": CACHE } });
    return NextResponse.json(
      {
        keyword,
        note: NOTE,
        geo: "IN",
        dbConfigured: true,
        searchTerm: r.topic_id,
        fetchedAt: (r.fetched_at instanceof Date ? r.fetched_at : new Date(r.fetched_at)).toISOString(),
        series: { points: r.series.points, momentum: r.series.momentum ?? null, recentChangePct: r.series.recentChangePct ?? null, yearOnYearChangePct: r.series.yearOnYearChangePct ?? null },
        risingQueries: r.rising_queries ?? [],
        source: { label: "Google Trends via Apify", url: `https://trends.google.com/trends/explore?geo=IN&q=${encodeURIComponent(r.topic_id ?? keyword)}` },
      },
      { headers: { "Cache-Control": CACHE } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load trends" }, { status: 500 });
  }
}
