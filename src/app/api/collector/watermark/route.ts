import { cronUnauthorized } from "@/lib/api-guard";
import { readWatermark } from "@/lib/collector/records";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/collector/watermark?id=broker-calls — delta cursor for Actions-runner collectors. Auth: Bearer CRON_SECRET. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id || !/^[a-z0-9-]{1,40}$/.test(id)) return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 });
  return NextResponse.json({ id, watermark: await readWatermark(id) });
}
