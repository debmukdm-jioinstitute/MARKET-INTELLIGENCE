import { cronUnauthorized } from "@/lib/api-guard";
import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { buildStress } from "@/lib/stress/build";
import { maybeFireAlert, saveStress } from "@/lib/stress/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Every 3h with the collector: snapshot the stress index, then evaluate the corroborated-alert gate. ?dry=1 computes only. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  try {
    const result = await buildStress();
    if (new URL(req.url).searchParams.get("dry") === "1" || !hasDatabase()) {
      return NextResponse.json({ ok: true, persisted: false, result });
    }
    await saveStress(result);
    const alert = await maybeFireAlert(result);
    return NextResponse.json({ ok: true, persisted: true, score: result.score, band: result.band, convergence: result.convergence, alert });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
