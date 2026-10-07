import { cronUnauthorized } from "@/lib/api-guard";
import { withCronRun } from "@/lib/admin/cron-log";
import { listFoUniverse } from "@/lib/options-flow/fo-universe";
import { runDataAgentAndSave } from "@/lib/options-flow/run";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Daily cron — Data Agent only, for the full NSE F&O universe (~210 names, 10-way concurrent), so a 30-day baseline accumulates for every optionable ticker even on days nobody opens the screener. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  return withCronRun("options-flow", req, async () => {
  const universe = await listFoUniverse();
  const results = await runDataAgentAndSave(universe.map((i) => i.symbol));
  return NextResponse.json({ ok: results.every((r) => r.ok), total: results.length, failed: results.filter((r) => !r.ok).length, results });
  },
    (b) => Number((b as { total?: number }).total) || 0,
  );
}
