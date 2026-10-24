import { NextResponse } from "next/server";
import { buildIndex, buildList } from "@/lib/indices/tipsheet-indices";

export const revalidate = 3600;

/** GET /api/indices/tipsheet[?slug=nifty-pharma] — the NSE index board, or one index's returns, years, falls, valuation and holdings. */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug");
  try {
    return NextResponse.json(slug ? await buildIndex(slug) : await buildList(), { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "indices failed" }, { status: e instanceof Error && e.message === "bad slug" ? 400 : 503 });
  }
}
