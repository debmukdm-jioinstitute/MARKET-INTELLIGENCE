import { cronUnauthorized } from "@/lib/api-guard";
import { refreshWeek52Levels } from "@/lib/feeds/india/week52-levels";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** After the close: refresh per-stock 52W high/low. One daily Vercel run uses the full time budget; resumable if incomplete. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  try {
    return NextResponse.json({ ok: true, ...(await refreshWeek52Levels(280_000)) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
