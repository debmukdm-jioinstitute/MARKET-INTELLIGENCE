import { cronUnauthorized } from "@/lib/api-guard";
import { setPromoterFeedSnapshot } from "@/lib/promoters/feed-cache";
import { fetchPromoterDisclosureFeed } from "@/lib/promoters/fetch-feed";
import { persistPromoterFeedItems } from "@/lib/promoters/persist";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;

  const snapshot = await fetchPromoterDisclosureFeed({ deep: true });
  setPromoterFeedSnapshot(snapshot);
  if (snapshot.items.length) await persistPromoterFeedItems(snapshot.items);

  return NextResponse.json({
    ok: snapshot.dataStatus === "AVAILABLE",
    count: snapshot.items.length,
    collectorsUsed: snapshot.collectorsUsed,
  });
}
