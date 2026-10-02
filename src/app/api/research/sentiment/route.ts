import { ensureSchema, hasDatabase, sql, toDateString } from "@/lib/db";
import { ALL_SOURCES, buildDigest, SOURCE_LABEL, type DailyRow, type QuadrantPoint, type SourceId } from "@/lib/research/sentiment";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CACHE = "public, s-maxage=21600, stale-while-revalidate=1800"; // 6 hours — collected daily
const NOTE = "Aggregates only: counts and themes, never individual posts or users. X/Twitter isn't available on any free API, so we don't track it. Telegram covers channel posts only (not discussion-group comments).";

type Row = { day: Date | string; source: string; mentions: number; volume_z: string | null; sentiment_mean: string | null; sentiment_velocity: string | null; buzzing: boolean | null; bullish_share: string | null; topics: string[] | null };
type QRow = { symbol: string; mentions: string | number; volume_z: string | null; sentiment: string | null; buzzing: boolean | null; topics: string[] | null };
const n = (v: string | null) => (v === null ? null : Number(v));

/**
 * GET /api/research/sentiment?symbol=RELIANCE&days=30  → per-source daily aggregates + 7-day digest.
 * GET /api/research/sentiment?view=quadrant            → market-wide buzz quadrant (volume z-score vs sentiment).
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const base = { note: NOTE, sources: ALL_SOURCES.map((s) => ({ id: s, label: SOURCE_LABEL[s] })) };
  if (!hasDatabase()) return NextResponse.json({ ...base, dbConfigured: false, series: [], digest: [], points: [] }, { headers: { "Cache-Control": CACHE } });

  try {
    await ensureSchema();
    const db = sql();

    if (sp.get("view") === "quadrant") {
      // Last two days, mentions-weighted sentiment, only tickers with a volume z-score (needs ≥ 7 days of history).
      const rows = (await db`
        WITH agg AS (
          SELECT symbol, sum(mentions) AS mentions, max(volume_z) AS volume_z,
                 sum(sentiment_mean * mentions) FILTER (WHERE sentiment_mean IS NOT NULL) / NULLIF(sum(mentions) FILTER (WHERE sentiment_mean IS NOT NULL), 0) AS sentiment,
                 bool_or(COALESCE(buzzing, false)) AS buzzing
          FROM sentiment_daily WHERE day >= current_date - 2 AND source <> 'gdelt'
          GROUP BY symbol
          HAVING sum(mentions) >= 3 AND max(volume_z) IS NOT NULL AND sum(sentiment_mean * mentions) FILTER (WHERE sentiment_mean IS NOT NULL) IS NOT NULL
        )
        SELECT a.symbol, a.mentions, a.volume_z, a.sentiment, a.buzzing,
               (SELECT d.topics FROM sentiment_daily d WHERE d.symbol = a.symbol AND d.day >= current_date - 2 AND d.topics IS NOT NULL ORDER BY d.mentions DESC LIMIT 1) AS topics
        FROM agg a ORDER BY a.mentions DESC LIMIT 60
      `) as QRow[];
      const points: QuadrantPoint[] = rows.map((r) => ({ symbol: r.symbol, mentions: Number(r.mentions), volumeZ: Number(r.volume_z), sentiment: Math.round(Number(r.sentiment) * 1000) / 1000, buzzing: Boolean(r.buzzing), topics: r.topics ?? [] }));
      return NextResponse.json({ ...base, dbConfigured: true, points }, { headers: { "Cache-Control": CACHE } });
    }

    const symbol = sp.get("symbol")?.trim().toUpperCase() ?? "";
    if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) return NextResponse.json({ error: "Missing or invalid symbol" }, { status: 400 });
    const days = Math.min(Math.max(Number(sp.get("days") ?? 30) || 30, 1), 120);
    const rows = (await db`
      SELECT day, source, mentions, volume_z, sentiment_mean, sentiment_velocity, buzzing, bullish_share, topics
      FROM sentiment_daily WHERE symbol = ${symbol} AND day >= (current_date - ${days}::int) ORDER BY day
    `) as Row[];
    const series: DailyRow[] = rows.map((r) => ({
      day: toDateString(r.day),
      source: r.source as SourceId,
      mentions: r.mentions,
      volumeZ: n(r.volume_z),
      sentimentMean: n(r.sentiment_mean),
      sentimentVelocity: n(r.sentiment_velocity),
      buzzing: Boolean(r.buzzing),
      bullishShare: n(r.bullish_share),
      topics: r.topics,
    }));
    return NextResponse.json({ ...base, symbol, dbConfigured: true, series, digest: buildDigest(series) }, { headers: { "Cache-Control": CACHE } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load sentiment" }, { status: 500 });
  }
}
