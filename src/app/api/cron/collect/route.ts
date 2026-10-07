import { cronUnauthorized } from "@/lib/api-guard";
import { withCronRun } from "@/lib/admin/cron-log";
import { NextResponse } from "next/server";
import { runCollectors } from "@/lib/collector/run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Daily cron. ?only=rbi,ecb runs a subset; ?dry=1 fetches and validates without writing to the DB. Auth: Bearer CRON_SECRET (same as other crons). */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  return withCronRun("collect", req, async () => {
  const sp = new URL(req.url).searchParams;
  const only = sp.get("only")?.split(",").filter(Boolean);
  const results = await runCollectors(only, sp.get("dry") === "1");
  return NextResponse.json({ ok: results.every((r) => r.ok), results }, { status: results.some((r) => r.ok) ? 200 : 502 });
  },
    (b) => { const r = (b as { results?: { ok?: boolean }[] }).results; return Array.isArray(r) ? r.filter((x) => x?.ok).length : 0; },
  );
}
