import { ensureSchema, hasDatabase, sql, toDateString } from "@/lib/db";
import { NextResponse } from "next/server";

export const revalidate = 900;

const CACHE = "public, s-maxage=86400, stale-while-revalidate=3600"; // 24 hours

type Row = {
  id: string;
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

const SHORT = "public, s-maxage=300, stale-while-revalidate=300";
const inflight = new Map<string, Promise<{ tp: number; tq: number } | null>>();
const failedUntil = new Map<string, number>();

/**
 * Rows stored before the in-house scorer (or while the old model was down) have no tone. Score them
 * once from the source PDF, write it back, and never touch the network again for that row.
 * Free: lexicon only. De-duplicated per row; failures back off 10 min.
 */
function backfillTone(r: Row): Promise<{ tp: number; tq: number } | null> {
  const hit = inflight.get(r.id);
  if (hit) return hit;
  if ((failedUntil.get(r.id) ?? 0) > Date.now()) return Promise.resolve(null);
  const job = (async () => {
    try {
      const { pdfText, toneOfSplit, TONE_METHOD } = await import("@/lib/collector/concalls");
      const { splitTranscript } = await import("@/lib/collector/concall-nlp");
      const t = toneOfSplit(splitTranscript(await pdfText(r.source_url)));
      if (t.tonePrepared === null || t.toneQa === null) throw new Error("no tone signal");
      const delta = Math.round((t.toneQa - t.tonePrepared) * 1000) / 1000;
      const by = `${r.generated_by ?? "extractive-rules"} + ${TONE_METHOD}`;
      await sql()`UPDATE concall_summaries SET tone_prepared = ${t.tonePrepared}, tone_qa = ${t.toneQa}, tone_delta = ${delta}, generated_by = ${by} WHERE id = ${r.id}`;
      return { tp: t.tonePrepared, tq: t.toneQa };
    } catch {
      failedUntil.set(r.id, Date.now() + 10 * 60_000);
      return null;
    } finally {
      inflight.delete(r.id);
    }
  })();
  inflight.set(r.id, job);
  return job;
}

const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<null>((res) => setTimeout(() => res(null), ms))]);

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
      SELECT id, quarter, transcript_date, guidance, growth_drivers, risks, qa_themes, tone_prepared, tone_qa, tone_delta, source_url, generated_by
      FROM concall_summaries WHERE symbol = ${symbol} ORDER BY transcript_date DESC, created_at DESC LIMIT 1
    `) as Row[];
    const r = rows[0];
    let backfilled = false;
    if (r && r.tone_prepared === null && r.source_url) {
      const t = await withTimeout(backfillTone(r), 25_000);
      if (t) {
        r.tone_prepared = String(t.tp);
        r.tone_qa = String(t.tq);
        r.tone_delta = String(Math.round((t.tq - t.tp) * 1000) / 1000);
        r.generated_by = `${r.generated_by ?? "extractive-rules"} + lexicon-tone`;
        backfilled = true;
      }
    }
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
      { headers: { "Cache-Control": r.tone_prepared === null && !backfilled ? SHORT : CACHE } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load concall summary" }, { status: 500 });
  }
}
