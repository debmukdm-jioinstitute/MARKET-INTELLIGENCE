import { ensureSchema, hasDatabase, sql, toDateString } from "@/lib/db";
import { computeOwnershipFlags, type OwnershipRow } from "@/lib/research/ownership";
import { NextResponse } from "next/server";

export const revalidate = 900;

const CACHE = "public, s-maxage=21600, stale-while-revalidate=1800"; // 6 hours — filings are quarterly
const NSE_SHP = "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern";

type Row = {
  broadcast_date: Date | string;
  quarter_end: Date | string | null;
  promoter_pct: string | null;
  fii_pct: string | null;
  dii_pct: string | null;
  public_pct: string | null;
  pledge_pct: string | null;
  shareholder_count: string | number | null;
  xbrl_url: string | null;
};
const num = (v: string | null) => (v === null ? null : Number(v));

/**
 * GET /api/research/ownership?symbol=RELIANCE
 * Latest shareholding breakdown, last-8-quarters series and deterministic
 * risk flags (pledge > 20%, pledge +5pp QoQ, promoter holding −2pp QoQ).
 * Dates are NSE filing dates; every flag links its filing.
 */
export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) return NextResponse.json({ error: "Missing or invalid symbol" }, { status: 400 });
  const nseUrl = `${NSE_SHP}?symbol=${encodeURIComponent(symbol)}`;
  const empty = { symbol, latest: null, series: [], flags: [], nseUrl };

  if (!hasDatabase()) return NextResponse.json({ ...empty, dbConfigured: false }, { headers: { "Cache-Control": CACHE } });

  try {
    await ensureSchema();
    // One extra row so the oldest of the 8 quarters still has a predecessor for QoQ rules.
    const rows = (await sql()`
      SELECT broadcast_date, quarter_end, promoter_pct, fii_pct, dii_pct, public_pct, pledge_pct, shareholder_count, xbrl_url
      FROM shareholding WHERE symbol = ${symbol} ORDER BY broadcast_date DESC LIMIT 9
    `) as Row[];
    const asc: OwnershipRow[] = rows
      .map((r) => ({
        broadcastDate: toDateString(r.broadcast_date),
        quarterEnd: r.quarter_end ? toDateString(r.quarter_end) : null,
        promoterPct: num(r.promoter_pct),
        fiiPct: num(r.fii_pct),
        diiPct: num(r.dii_pct),
        publicPct: num(r.public_pct),
        pledgePct: num(r.pledge_pct),
        shareholderCount: r.shareholder_count === null ? null : Number(r.shareholder_count),
        xbrlUrl: r.xbrl_url,
      }))
      .reverse();
    const last8 = asc.slice(-8);
    const cutoff = last8[0]?.broadcastDate ?? "";
    return NextResponse.json(
      {
        symbol,
        dbConfigured: true,
        latest: asc[asc.length - 1] ?? null,
        series: last8.map((r) => ({ broadcastDate: r.broadcastDate, quarterEnd: r.quarterEnd, promoterPct: r.promoterPct, pledgePct: r.pledgePct })),
        flags: computeOwnershipFlags(asc).filter((f) => f.broadcastDate >= cutoff),
        nseUrl,
      },
      { headers: { "Cache-Control": CACHE } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load ownership" }, { status: 500 });
  }
}
