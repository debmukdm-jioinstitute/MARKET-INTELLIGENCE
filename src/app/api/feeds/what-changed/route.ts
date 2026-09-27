import { getMarketShiftsCached } from "@/lib/feeds/what-changed/cache";
import { shiftsRefreshMs } from "@/lib/feeds/what-changed/build-shifts";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_AGE = Math.floor(shiftsRefreshMs() / 1000);

export async function GET() {
  try {
    const payload = await getMarketShiftsCached(false);
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": `public, max-age=${MAX_AGE}, stale-while-revalidate=600`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "What-changed build failed" },
      { status: 502 },
    );
  }
}
