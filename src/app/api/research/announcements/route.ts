import { categorize, parseNseSortDate } from "@/lib/collector/announcements";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { nseJson } from "@/lib/feeds/india/nse-session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 900;

const CACHE = "public, s-maxage=3600, stale-while-revalidate=600";
const NSE_FILINGS = "https://www.nseindia.com/companies-listing/corporate-filings-announcements";

type Item = { headline: string; category: string; broadcastDate: string; attachmentUrl: string | null };
type RawNse = {
  symbol?: string | null;
  desc?: string | null;
  attchmntText?: string | null;
  attchmntFile?: string | null;
  sort_date?: string | null;
};

const memoryCache = new Map<string, { at: number; items: Item[]; rawCategories: { category: string; count: number }[] }>();
const CACHE_TTL_MS = 15 * 60_000;

/**
 * GET /api/research/announcements?symbol=RELIANCE&category=&limit=20
 *
 * Material NSE announcements collected for the symbol, newest first. Every
 * item links to its official NSE source (the attached PDF when there is one).
 * Backed by live NSE crawl fallback when database rows are not pre-populated.
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const symbol = sp.get("symbol")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) return NextResponse.json({ error: "Missing or invalid symbol" }, { status: 400 });
  const category = sp.get("category")?.trim().slice(0, 60) || null;
  const limit = Math.min(Math.max(Number(sp.get("limit") ?? 20) || 20, 1), 100);
  const nseUrl = `${NSE_FILINGS}?symbol=${encodeURIComponent(symbol)}&tabIndex=equity`;

  // 1. Try DB first if configured
  if (hasDatabase()) {
    try {
      await ensureSchema();
      const db = sql();
      type DbItem = { headline: string; category: string; broadcast_date: Date | string; attachment_url: string | null };
      type Cat = { category: string; n: number };
      const [itemRows, catRows] = await Promise.all([
        db`
          SELECT headline, category, broadcast_date, attachment_url
          FROM company_announcements
          WHERE symbol = ${symbol} AND (${category}::text IS NULL OR category = ${category})
          ORDER BY broadcast_date DESC
          LIMIT ${limit}
        `,
        db`
          SELECT category, count(*)::int AS n FROM company_announcements
          WHERE symbol = ${symbol} GROUP BY category ORDER BY n DESC
        `,
      ]);

      const items = itemRows as DbItem[];
      const categories = catRows as Cat[];

      if (items.length > 0) {
        const out = items.map((r) => ({
          headline: r.headline,
          category: r.category,
          broadcastDate: (r.broadcast_date instanceof Date ? r.broadcast_date : new Date(r.broadcast_date)).toISOString(),
          attachmentUrl: r.attachment_url,
        }));
        return NextResponse.json(
          { symbol, dbConfigured: true, count: out.length, items: out, categories: categories.map((c) => ({ category: c.category, count: c.n })), nseUrl },
          { headers: { "Cache-Control": CACHE } },
        );
      }
    } catch {
      // Fall through to live crawl
    }
  }

  // 2. Live crawl from NSE official announcements endpoint
  try {
    const cached = memoryCache.get(symbol);
    let allItems: Item[] = [];
    let allCategories: { category: string; count: number }[] = [];

    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      allItems = cached.items;
      allCategories = cached.rawCategories;
    } else {
      const raw = await nseJson<RawNse[]>(`/api/corporate-announcements?index=equities&symbol=${encodeURIComponent(symbol)}`);
      if (Array.isArray(raw)) {
        const catMap = new Map<string, number>();
        const parsedItems: Item[] = [];

        for (const r of raw) {
          const headline = r.attchmntText?.replace(/\s+/g, " ").trim();
          const broadcastDate = r.sort_date ? parseNseSortDate(r.sort_date) : null;
          if (!headline || !broadcastDate) continue;

          const desc = r.desc?.trim() ?? "";
          const cat = categorize(desc, headline) ?? (desc ? desc : "General Updates");
          catMap.set(cat, (catMap.get(cat) ?? 0) + 1);

          parsedItems.push({
            headline,
            category: cat,
            broadcastDate,
            attachmentUrl: r.attchmntFile?.trim() || null,
          });

          if (parsedItems.length >= 80) break;
        }

        allItems = parsedItems;
        allCategories = Array.from(catMap.entries()).map(([c, n]) => ({ category: c, count: n }));
        memoryCache.set(symbol, { at: Date.now(), items: allItems, rawCategories: allCategories });
      }
    }

    const filtered = category ? allItems.filter((it) => it.category === category) : allItems;
    const paged = filtered.slice(0, limit);

    return NextResponse.json(
      {
        symbol,
        dbConfigured: hasDatabase(),
        count: filtered.length,
        items: paged,
        categories: allCategories,
        nseUrl,
      },
      { headers: { "Cache-Control": CACHE } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load corporate announcements", nseUrl },
      { status: 500 },
    );
  }
}
