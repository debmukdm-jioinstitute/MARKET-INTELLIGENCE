import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { cronUnauthorized } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

/** POST /api/revalidate?tag=ts:nse_bhavcopy  (Bearer CRON_SECRET). Called by the ts-ingest runner. */
export async function POST(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  const tag = new URL(req.url).searchParams.get("tag") ?? "";
  if (!/^ts:[a-z0-9_]+$/.test(tag)) return NextResponse.json({ error: "tag must match ts:<dataset>" }, { status: 400 });
  revalidateTag(tag, "max");
  return NextResponse.json({ revalidated: tag });
}
