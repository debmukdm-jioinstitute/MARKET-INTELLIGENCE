import { cronUnauthorized } from "@/lib/api-guard";
import { syncAllIndicatorCatalogs, syncStatus } from "@/lib/data360/sync";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Weekly: refresh Data360 dataset + indicator id catalog. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  try {
    return NextResponse.json({ ok: true, catalog: await syncAllIndicatorCatalogs(), status: await syncStatus() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
