import { cronUnauthorized } from "@/lib/api-guard";
import { withCronRun } from "@/lib/admin/cron-log";
import { getFeedHubCached } from "@/lib/feeds/hub-cache";
import { feedHealthToResults, recordSourceResults } from "@/lib/health/sources";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  return withCronRun(
    "warm-feed-hub",
    req,
    async () => {
      try {
        const payload = await getFeedHubCached(true);
        // Persist per-source outcomes for the Phase 5 source-health monitor.
        // Best-effort: a recording failure must not fail the warm itself.
        await recordSourceResults(feedHealthToResults(payload.health)).catch(() => {});
        return NextResponse.json({
          ok: true,
          fetchedAt: payload.fetchedAt,
          newsCount: payload.news.length,
          openSources: payload.health.filter((h) =>
            ["reddit", "livemint", "moneycontrol", "googlenews", "busstd", "rsswire"].includes(h.id),
          ),
        });
      } catch (e) {
        return NextResponse.json(
          { ok: false, error: e instanceof Error ? e.message : "warm failed" },
          { status: 500 },
        );
      }
    },
    (b) => Number((b as { newsCount?: number })?.newsCount) || 0,
  );
}
