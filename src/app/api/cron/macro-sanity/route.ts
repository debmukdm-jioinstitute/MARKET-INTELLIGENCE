import { cronUnauthorized } from "@/lib/api-guard";
import { hasDatabase } from "@/lib/db";
import { syncTrackedData } from "@/lib/data360/sync";
import { buildIndiaMacroHub } from "@/lib/macro/build-hub";
import { auditMacroHub } from "@/lib/macro/sanity";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Scheduled macro desk sanity check: rebuild India macro hub, audit section freshness,
 * optionally nudge Data360 mirror when World Bank-backed series look stale.
 */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;

  const sp = new URL(req.url).searchParams;
  const sync = sp.get("sync") !== "0";

  let payload;
  try {
    payload = await buildIndiaMacroHub();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "buildIndiaMacroHub failed" },
      { status: 502 },
    );
  }

  const report = auditMacroHub(payload);
  const staleSections = report.sections.filter((s) => s.stale.length > 0).map((s) => s.section);

  let data360: unknown = null;
  if (sync && hasDatabase()) {
    try {
      const { runCollectors } = await import("@/lib/collector/run");
      await runCollectors(["india-macro", "rbi", "rbi-market", "fred-reserves"]);
    } catch {
      /* audit still returns */
    }
    if (staleSections.some((s) => s !== "consumer" && s !== "corporate")) {
      try {
        data360 = await syncTrackedData();
      } catch (e) {
        data360 = { error: e instanceof Error ? e.message : String(e) };
      }
    }
  }

  return NextResponse.json(
    {
      ok: report.ok,
      report,
      staleSections,
      data360Sync: data360 != null,
      data360,
    },
    { status: report.ok ? 200 : 207 },
  );
}
