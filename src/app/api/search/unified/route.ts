import { unifiedSearch } from "@/lib/search/unified-search";
import { getSessionUser } from "@/lib/session";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { syncPortalPageRegistry, isPortalHrefAllowed, type PortalPageControlRow } from "@/lib/portal-page-access";
import { buildPortalPageRegistry } from "@/lib/portal-page-registry";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TTL_MS = 30_000;
let controlsCache: { at: number; controls: PortalPageControlRow[] } | null = null;

/**
 * Same portal-page access control the command palette applies via
 * `usePortalPages().hrefAllowed` (`src/components/command-palette/command-palette.tsx`),
 * read directly from the DB here since this is a server route, not a client
 * hook. Without this, a page whose access is locked/disabled for the current
 * account would still appear — and be directly clickable — in the unified
 * search dropdown while staying correctly hidden from ⌘K, which is a real
 * regression from "finds relevant pages the way the existing command palette
 * ... does today."
 */
async function loadPortalControls(): Promise<PortalPageControlRow[]> {
  if (!hasDatabase()) return [];
  const now = Date.now();
  if (controlsCache && now - controlsCache.at < TTL_MS) return controlsCache.controls;
  await ensureSchema();
  const db = sql();
  await syncPortalPageRegistry(db, buildPortalPageRegistry());
  const controls = (await db`
    SELECT href, label, nav_section, nav_group, sort_order, enabled, locked, lock_message, applies_to_children, updated_at
    FROM portal_page_controls
  `) as PortalPageControlRow[];
  controlsCache = { at: now, controls };
  return controls;
}

/** Backs the unified search bar (SymbolSearch) — symbols + pages + help, one query. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ query: "", isQuestion: false, symbols: [], pages: [], help: [], suggestAsk: false });
  }
  try {
    const [result, user, controls] = await Promise.all([
      unifiedSearch(q),
      getSessionUser(),
      loadPortalControls(),
    ]);

    const bypass = user?.role === "admin";
    const pages = controls.length
      ? result.pages.filter((p) => isPortalHrefAllowed(p.href, controls, bypass))
      : result.pages;

    // Access-gating can drop every page hit; recompute the Ask-Deb fallback
    // signal against the filtered set so a locked-page match doesn't leave
    // the bar silently empty (unifiedSearch's own suggestAsk was computed
    // before this filter ran).
    const hasMatch = result.symbols.length > 0 || result.help.length > 0 || pages.length > 0;
    const suggestAsk = result.isQuestion || !hasMatch;

    return NextResponse.json(
      { ...result, pages, suggestAsk },
      { headers: { "Cache-Control": "private, max-age=0, must-revalidate" } },
    );
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
