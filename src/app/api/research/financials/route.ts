import { cachedSWR, hasRedis } from "@/lib/cache/redis";
import { getCompanyFinancials } from "@/lib/financials/service";
import { panelCacheKey } from "@/lib/research/panel-cache";
import { after, NextResponse } from "next/server";

let redisWarned = false;

export const dynamic = "force-dynamic";
// L6: no `revalidate` here — under force-dynamic it is dead, and the real
// policy is the Redis SWR below (6h fresh / 3d TTL). Leaving it misled readers.

const REV_TAGS = ["RevenueFromOperations", "InterestEarned", "Income"];

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) {
    return NextResponse.json({ error: "Missing or invalid symbol" }, { status: 400 });
  }

  try {
    // L7: without Redis every view re-runs the full NSE fan-out (4 metadata +
    // up to 10 XBRL downloads). The service's 15-min in-memory cache still
    // absorbs back-to-back views on a warm instance; warn once so ops notices.
    if (!hasRedis() && !redisWarned) {
      redisWarned = true;
      console.warn("[financials] Redis unavailable — NSE fan-out runs per view (in-memory cache only). Check UPSTASH_REDIS_REST_URL/TOKEN.");
    }
    const { value: payload, cache } = await cachedSWR(
      panelCacheKey("financials", symbol),
      {
        freshMs: 6 * 60 * 60_000,
        ttlSec: 3 * 24 * 60 * 60,
        // M8 canary: never cache a payload that has quarter columns but no
        // revenue row — currently impossible per xbrl.ts, so this is a
        // tripwire against a future parser regression, not a fix.
        shouldCache: (p) => {
          if (!p || p.quarters.length === 0) return true;
          const rev = p.pl.quarters.find((r) => REV_TAGS.includes(r.tag));
          return !!rev && Object.values(rev.values).some((v) => v != null);
        },
      },
      () => getCompanyFinancials(symbol),
      (task) => after(task),
    );
    if (!payload) {
      return NextResponse.json({ error: `No financial statements found for ${symbol}` }, { status: 404 });
    }
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        "x-mi-cache": cache,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load company financials" },
      { status: 500 },
    );
  }
}
