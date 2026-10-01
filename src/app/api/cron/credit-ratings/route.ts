import { cronUnauthorized } from "@/lib/api-guard";
import { fetchCreditRatingFeed } from "@/lib/credit/fetch-feed";
import { setCreditFeedSnapshot } from "@/lib/credit/feed-cache";
import { persistCreditFeedItems } from "@/lib/credit/persist";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Daily deep refresh — RSS + Firecrawl/Crawl4AI when env keys set. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;

  const snapshot = await fetchCreditRatingFeed({ deep: true });
  setCreditFeedSnapshot(snapshot);
  if (snapshot.items.length) await persistCreditFeedItems(snapshot.items);

  return NextResponse.json({
    ok: snapshot.dataStatus === "AVAILABLE",
    count: snapshot.items.length,
    collectorsUsed: snapshot.collectorsUsed,
  });
}
