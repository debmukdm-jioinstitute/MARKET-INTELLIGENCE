import { cronUnauthorized } from "@/lib/api-guard";
import { refreshWeek52Levels } from "@/lib/feeds/india/week52-levels";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** After the close: refresh per-stock 52W high/low. Resumable — repeat runs pick up where the last stopped. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  try {
    return NextResponse.json({ ok: true, ...(await refreshWeek52Levels()) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
