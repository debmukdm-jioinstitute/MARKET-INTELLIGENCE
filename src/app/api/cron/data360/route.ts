import { cronUnauthorized } from "@/lib/api-guard";
import { syncAllIndicatorCatalogs, syncStatus, syncTrackedData } from "@/lib/data360/sync";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * World Bank Data360 mirror (https://data360.worldbank.org/en/api).
 * ?mode=catalog — refresh dataset + indicator id lists
 * default — paginate observations for incomplete indicators (resumable)
 */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  const mode = new URL(req.url).searchParams.get("mode");
  try {
    if (mode === "catalog") {
      return NextResponse.json({ ok: true, catalog: await syncAllIndicatorCatalogs(), status: await syncStatus() });
    }
    const results = await syncTrackedData();
    return NextResponse.json({ ok: true, results, status: await syncStatus() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
