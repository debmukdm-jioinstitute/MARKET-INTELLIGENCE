import { cronUnauthorized } from "@/lib/api-guard";
import { syncNseInstruments } from "@/lib/my-portfolio/nse-instruments-sync";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Invoked weekly by the vercel.json cron — Vercel signs cron requests with this bearer token. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  try {
    const result = await syncNseInstruments();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Sync failed" }, { status: 502 });
  }
}
