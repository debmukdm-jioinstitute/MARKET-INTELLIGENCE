import { unifiedSearch } from "@/lib/search/unified-search";
import { NextResponse } from "next/server";

/**
 * Backs the unified search bar (SymbolSearch) — symbols + pages + help, one query.
 *
 * Pure compute on purpose: no DB / session on this path. Portal-page access gating (locked or
 * disabled pages) is applied client-side in SymbolSearch via `usePortalPages().hrefAllowed`, the
 * same check the command palette uses. The old server-side gating awaited `ensureSchema` +
 * `syncPortalPageRegistry` + a session lookup on every cold instance, adding 10s+ to the first
 * keystroke. Results are public and identical for every user, so they are CDN-cacheable.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ query: "", isQuestion: false, symbols: [], pages: [], help: [], suggestAsk: false });
  }
  try {
    const result = await unifiedSearch(q);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600" },
    });
  } catch (e) {
    return NextResponse.json(
      {
        query: q,
        isQuestion: false,
        symbols: [],
        pages: [],
        help: [],
        suggestAsk: true,
        error: e instanceof Error ? e.message : "Search failed",
      },
      { status: 502 },
    );
  }
}
