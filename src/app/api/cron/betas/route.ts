import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { computeBetas, saveBetas } from "@/lib/transmission/betas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Daily: recompute the sector×factor beta matrix. ?dry=1 computes without saving. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const b = await computeBetas();
    const dry = new URL(req.url).searchParams.get("dry") === "1";
    if (!dry && hasDatabase()) await saveBetas(b);
    return NextResponse.json({ ok: true, persisted: !dry && hasDatabase(), sectors: b.sectors.length, window: [b.windowStart, b.windowEnd] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
