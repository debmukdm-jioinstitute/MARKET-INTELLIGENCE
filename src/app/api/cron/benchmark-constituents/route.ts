import { cronUnauthorized } from "@/lib/api-guard";
import { refreshAllIndiaBenchmarkWeights, refreshBenchmarkWeights } from "@/lib/my-portfolio/refresh-benchmark-weights";
import { isBenchmarkId } from "@/lib/my-portfolio/benchmark-options";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Refresh NSE index constituent weights (archives CSV + Yahoo cap proxy). ?only=NIFTY50 for one index. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  const only = new URL(req.url).searchParams.get("only");
  try {
    if (only && isBenchmarkId(only)) {
      const row = await refreshBenchmarkWeights(only);
      return NextResponse.json({
        ok: Boolean(row?.weights && Object.keys(row.weights).length),
        benchmark: only,
        symbols: row ? Object.keys(row.weights).length : 0,
        method: row?.method,
        asOf: row?.asOf,
      });
    }
    const results = await refreshAllIndiaBenchmarkWeights();
    return NextResponse.json({
      ok: results.some((r) => r.ok),
      results,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Refresh failed" }, { status: 502 });
  }
}
