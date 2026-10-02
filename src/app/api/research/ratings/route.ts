import { ensureSchema, hasDatabase, sql, toDateString } from "@/lib/db";
import { buildAgencyGrid, buildRatingEvents, hasRecentAlert, type FilingDisclosure, type RatingRowView } from "@/lib/research/ratings";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CACHE = "public, s-maxage=86400, stale-while-revalidate=3600"; // 24 hours — rating actions are low-volume

type Row = { agency: string; rating: string | null; notch: string | null; outlook: string | null; watch: string | null; action: string | null; action_date: Date | string; rationale_url: string | null; source: string | null };
type Filing = { headline: string; broadcast_date: Date | string; attachment_url: string | null };

/**
 * GET /api/research/ratings?symbol=RELIANCE
 * Agency grid (CRISIL / CARE / ICRA) + radar events (downgrade, negative outlook,
 * negative watch) newest-first. Rationale PDFs are linked, never summarised.
 */
export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) return NextResponse.json({ error: "Missing or invalid symbol" }, { status: 400 });
  const empty = { symbol, agencies: buildAgencyGrid([]), events: [], alert: false };
  if (!hasDatabase()) return NextResponse.json({ ...empty, dbConfigured: false }, { headers: { "Cache-Control": CACHE } });

  try {
    await ensureSchema();
    const db = sql();
    const [rows, filings] = await Promise.all([
      db`
        SELECT agency, rating, notch, outlook, watch, action, action_date, rationale_url, source
        FROM credit_ratings WHERE symbol = ${symbol} AND action_date >= (current_date - 730::int)
        ORDER BY action_date DESC LIMIT 300
      `,
      db`
        SELECT headline, broadcast_date, attachment_url FROM company_announcements
        WHERE symbol = ${symbol} AND category = 'Credit rating' AND broadcast_date >= now() - interval '90 days'
        ORDER BY broadcast_date DESC LIMIT 10
      `,
    ]);
    const views: RatingRowView[] = (rows as Row[]).map((r) => ({
      agency: r.agency,
      rating: r.rating,
      notch: r.notch,
      outlook: r.outlook,
      watch: r.watch,
      action: r.action,
      actionDate: toDateString(r.action_date),
      rationaleUrl: r.rationale_url,
      source: r.source,
    }));
    const disclosures: FilingDisclosure[] = (filings as Filing[]).map((f) => ({ date: toDateString(f.broadcast_date), headline: f.headline, url: f.attachment_url }));
    const events = buildRatingEvents(views, disclosures);
    return NextResponse.json({ symbol, dbConfigured: true, agencies: buildAgencyGrid(views), events, alert: hasRecentAlert(events) }, { headers: { "Cache-Control": CACHE } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load ratings" }, { status: 500 });
  }
}
