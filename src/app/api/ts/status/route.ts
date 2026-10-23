import { NextResponse } from "next/server";
import { hasDatabase, sql, toDateString } from "@/lib/db";
import { ensureTsSchema } from "@/lib/ts-charts/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDatabase()) return NextResponse.json([], { headers: { "Cache-Control": "s-maxage=300" } });
  try {
    await ensureTsSchema();
    const rows = (await sql()`SELECT dataset, latest_obs, state, expected_lag_days, last_run, last_error FROM ts_dataset_status ORDER BY dataset`) as unknown as Record<string, unknown>[];
    return NextResponse.json(
      rows.map((r) => ({ ...r, latest_obs: r.latest_obs ? toDateString(r.latest_obs) : null })),
      { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=3600" } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "status failed" }, { status: 503 });
  }
}
