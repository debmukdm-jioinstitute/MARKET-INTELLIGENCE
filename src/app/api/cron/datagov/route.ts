import { cronUnauthorized } from "@/lib/api-guard";
import { NextResponse } from "next/server";
import { DataGovAuthError, hasPersonalKey } from "@/lib/datagov/client";
import { discoverTracked, syncCatalog, syncTracked } from "@/lib/datagov/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily cron. ?mode=catalog → crawl catalog for a sector (?sector=Finance&pages=5)
 *              ?mode=discover → (re)seed the tracked watchlist
 *              default → sync rows for tracked datasets (resumable, time-boxed)
 */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  const sp = new URL(req.url).searchParams;
  try {
    const mode = sp.get("mode");
    if (mode === "catalog") {
      return NextResponse.json(await syncCatalog({ sector: sp.get("sector") ?? undefined, maxPages: Number(sp.get("pages") ?? 5) }));
    }
    if (mode === "discover") return NextResponse.json({ tracked: await discoverTracked() });
    if (!hasPersonalKey()) {
      return NextResponse.json({ ok: false, error: "DATA_GOV_IN_API_KEY not set — row sync needs a personal key" }, { status: 503 });
    }
    return NextResponse.json({ ok: true, results: await syncTracked() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e), needsKey: e instanceof DataGovAuthError }, { status: 500 });
  }
}
