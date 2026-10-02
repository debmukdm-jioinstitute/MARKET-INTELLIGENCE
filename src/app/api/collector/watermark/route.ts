import { cronUnauthorized } from "@/lib/api-guard";
import { readWatermark, readWatermarks } from "@/lib/collector/records";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const KEY = /^[A-Za-z0-9:_.&-]{1,80}$/;

/**
 * GET /api/collector/watermark?id=broker-calls        → { id, watermark }
 * GET /api/collector/watermark?prefix=shareholding:   → { prefix, watermarks: { key: value } }
 * Delta cursors for Actions-runner collectors. Auth: Bearer CRON_SECRET.
 */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  const sp = new URL(req.url).searchParams;
  const prefix = sp.get("prefix")?.trim();
  if (prefix) {
    if (!KEY.test(prefix)) return NextResponse.json({ error: "Invalid prefix" }, { status: 400 });
    return NextResponse.json({ prefix, watermarks: await readWatermarks(prefix) });
  }
  const id = sp.get("id")?.trim();
  if (!id || !KEY.test(id)) return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 });
  return NextResponse.json({ id, watermark: await readWatermark(id) });
}
