import { ensureSchema, hasDatabase, sql, toDateString } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CACHE = "public, s-maxage=86400, stale-while-revalidate=3600"; // 24 hours

type Row = {
  quarter: string | null;
  transcript_date: Date | string;
  guidance: string[] | null;
  growth_drivers: string[] | null;
  risks: string[] | null;
  qa_themes: string[] | null;
  tone_prepared: string | null;
  tone_qa: string | null;
  tone_delta: string | null;
  source_url: string;
  generated_by: string | null;
};
const num = (v: string | null) => (v === null ? null : Number(v));

/**
 * GET /api/research/concall?symbol=RELIANCE
 * Latest "said vs guided" summary built from the company's own earnings-call
 * transcript. Highlights are extracted from, and link back to, the source PDF.
 * `generated_by` names exactly which methods produced it.
 */
export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) return NextResponse.json({ error: "Missing or invalid symbol" }, { status: 400 });
  if (!hasDatabase()) return NextResponse.json({ symbol, dbConfigured: false, summary: null }, { headers: { "Cache-Control": CACHE } });

  try {
    await ensureSchema();
    const rows = (await sql()`
      SELECT quarter, transcript_date, guidance, growth_drivers, risks, qa_themes, tone_prepared, tone_qa, tone_delta, source_url, generated_by
      FROM concall_summaries WHERE symbol = ${symbol} ORDER BY transcript_date DESC, created_at DESC LIMIT 1
    `) as Row[];
    const r = rows[0];
    if (!r) return NextResponse.json({ symbol, dbConfigured: true, summary: null }, { headers: { "Cache-Control": CACHE } });
    return NextResponse.json(
      {
        symbol,
        dbConfigured: true,
        summary: {
          quarter: r.quarter,
          transcriptDate: toDateString(r.transcript_date),
          guidance: r.guidance ?? [],
          growthDrivers: r.growth_drivers ?? [],
          risks: r.risks ?? [],
          qaThemes: r.qa_themes ?? [],
          tonePrepared: num(r.tone_prepared),
          toneQa: num(r.tone_qa),
          toneDelta: num(r.tone_delta),
          sourceUrl: r.source_url,
          generatedBy: r.generated_by ?? "extractive-rules",
        },
      },
      { headers: { "Cache-Control": CACHE } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load concall summary" }, { status: 500 });
  }
}
