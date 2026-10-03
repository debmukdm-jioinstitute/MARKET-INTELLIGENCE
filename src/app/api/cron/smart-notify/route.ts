import { cronUnauthorized } from "@/lib/api-guard";
import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { runSmartDelivery } from "@/lib/notify/smart/deliver";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/cron/smart-notify — CRON_SECRET-guarded.
 * Runs smart detectors, then delivers per-user: critical pushes + bell placement.
 * Hit every 30 min from GitHub Actions (.github/workflows/smart-notify.yml).
 * ?dry=1 runs detection only (no pushes, no interaction writes beyond dedupe).
 */
export async function POST(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  if (!hasDatabase()) return NextResponse.json({ ok: false, error: "No database configured" }, { status: 503 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  try {
    if (dry) {
      const { runAllDetectors } = await import("@/lib/notify/smart/detectors");
      const { sql } = await import("@/lib/db");
      const query = (s: TemplateStringsArray, ...v: unknown[]) => sql()(s, ...v) as Promise<Record<string, unknown>[]>;
      const detected = await runAllDetectors({ query });
      return NextResponse.json({ ok: true, dry: true, detected: detected.length, sample: detected.slice(0, 5).map((d) => ({ key: d.key, title: d.title, importance: d.importance })) });
    }
    const report = await runSmartDelivery();
    return NextResponse.json({ ok: true, ...report });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
