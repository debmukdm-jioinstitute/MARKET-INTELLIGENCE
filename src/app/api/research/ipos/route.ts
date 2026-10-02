import { ensureSchema, hasDatabase, sql, toDateString } from "@/lib/db";
import { applyChecklist, computeMomentum, STAGES, type SnapshotPoint } from "@/lib/research/ipos";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CACHE = "public, s-maxage=3600, stale-while-revalidate=600"; // 1 hour
const GMP_DISCLAIMER = "Unofficial dealer quotes — unregulated, unaudited, can be manipulated. Not a listing-price prediction.";
const GMP_EXPLAINER = "https://www.jainam.in/blog/what-is-grey-market/";

type IpoRow = {
  id: string;
  company: string;
  symbol: string | null;
  series: string | null;
  stage: string;
  issue_size: string | null;
  price_band_low: string | null;
  price_band_high: string | null;
  lot_size: string | number | null;
  open_date: Date | string | null;
  close_date: Date | string | null;
  allotment_date: Date | string | null;
  listing_date: Date | string | null;
  brlms: string[] | null;
  drhp_url: string | null;
  top_risks: string[] | null;
  objects_breakdown: { objects?: { title: string; category: string }[]; freshIssueMillions?: number | null; hasOfferForSale?: boolean } | null;
  gmp_value: string | null;
  gmp_pct: string | null;
  gmp_low: string | null;
  gmp_high: string | null;
  gmp_sources: string[] | null;
  gmp_updated_at: Date | string | null;
  source: string | null;
};
type SnapRow = { ipo_id: string; snapshot_at: Date | string; qib_x: string | null; nii_x: string | null; rii_x: string | null; total_x: string | null };

const n = (v: string | null) => (v === null ? null : Number(v));
const d = (v: Date | string | null) => (v ? toDateString(v) : null);

/**
 * GET /api/research/ipos?stage=open&limit=50
 * IPO funnel (DRHP filed → SEBI nod → Open → Allotment → Listed) with the latest
 * subscription snapshot + day-over-day velocity, the apply checklist, DRHP risks /
 * objects (verbatim from the prospectus) and GMP (sentiment only; range when the
 * two sources disagree).
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const stage = sp.get("stage")?.trim() ?? "";
  const limit = Math.min(Math.max(Number(sp.get("limit") ?? 50) || 50, 1), 100);
  if (stage && !(STAGES as readonly string[]).includes(stage)) return NextResponse.json({ error: "Unknown stage" }, { status: 400 });
  const base = { stages: STAGES, gmpDisclaimer: GMP_DISCLAIMER, gmpExplainerUrl: GMP_EXPLAINER };
  if (!hasDatabase()) return NextResponse.json({ ...base, dbConfigured: false, counts: {}, ipos: [] }, { headers: { "Cache-Control": CACHE } });

  try {
    await ensureSchema();
    const db = sql();
    const [countRows, ipoRows] = await Promise.all([
      db`SELECT stage, count(*)::int AS n FROM ipos GROUP BY stage`,
      db`
        SELECT id, company, symbol, series, stage, issue_size, price_band_low, price_band_high, lot_size, open_date, close_date, allotment_date, listing_date,
               brlms, drhp_url, top_risks, objects_breakdown, gmp_value, gmp_pct, gmp_low, gmp_high, gmp_sources, gmp_updated_at, source
        FROM ipos
        WHERE (${stage}::text = '' OR stage = ${stage})
        ORDER BY CASE stage WHEN 'open' THEN 1 WHEN 'sebi_nod' THEN 2 WHEN 'allotment' THEN 3 WHEN 'listed' THEN 4 ELSE 5 END,
                 COALESCE(open_date, close_date, listing_date) DESC NULLS LAST, company
        LIMIT ${limit}
      `,
    ]);
    const ipos = ipoRows as IpoRow[];
    const ids = ipos.map((i) => i.id);
    const snaps = ids.length
      ? ((await db`
          SELECT ipo_id, snapshot_at, qib_x, nii_x, rii_x, total_x FROM ipo_subscription_snapshots
          WHERE ipo_id = ANY(${ids}::uuid[]) AND snapshot_at > now() - interval '14 days' ORDER BY snapshot_at
        `) as SnapRow[])
      : [];
    const byIpo = new Map<string, SnapshotPoint[]>();
    for (const s of snaps) {
      const arr = byIpo.get(s.ipo_id) ?? [];
      arr.push({ at: (s.snapshot_at instanceof Date ? s.snapshot_at : new Date(s.snapshot_at)).toISOString(), qibX: n(s.qib_x), niiX: n(s.nii_x), riiX: n(s.rii_x), totalX: n(s.total_x) });
      byIpo.set(s.ipo_id, arr);
    }

    const counts = Object.fromEntries((countRows as { stage: string; n: number }[]).map((r) => [r.stage, r.n]));
    return NextResponse.json(
      {
        ...base,
        dbConfigured: true,
        counts,
        ipos: ipos.map((i) => {
          const series = byIpo.get(i.id) ?? [];
          const priceHigh = n(i.price_band_high);
          const lo = n(i.gmp_low);
          const hi = n(i.gmp_high);
          return {
            company: i.company,
            symbol: i.symbol,
            board: i.series,
            stage: i.stage,
            issueSizeCr: n(i.issue_size),
            priceBand: { low: n(i.price_band_low), high: priceHigh },
            dates: { open: d(i.open_date), close: d(i.close_date), allotment: d(i.allotment_date), listing: d(i.listing_date) },
            brlms: i.brlms ?? [],
            prospectusUrl: i.drhp_url,
            topRisks: i.top_risks ?? [],
            objects: i.objects_breakdown ?? null,
            subscription: { ...computeMomentum(series), series: series.slice(-12) },
            apply: applyChecklist(i.lot_size === null ? null : Number(i.lot_size), priceHigh),
            gmp:
              lo === null && hi === null
                ? null
                : { value: n(i.gmp_value), low: lo, high: hi, pct: n(i.gmp_pct), sources: i.gmp_sources ?? [], updatedAt: i.gmp_updated_at ? new Date(i.gmp_updated_at).toISOString() : null, disagree: n(i.gmp_value) === null && lo !== hi },
            source: i.source,
          };
        }),
      },
      { headers: { "Cache-Control": CACHE } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load IPOs" }, { status: 500 });
  }
}
