import { NextResponse } from "next/server";
import { buildStress } from "@/lib/stress/build";
import { recentAlerts, stressHistory } from "@/lib/stress/store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const [current, history, alerts] = await Promise.all([buildStress(), stressHistory(30), recentAlerts(10)]);
    return NextResponse.json({ current, history, alerts }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "stress failed" }, { status: 502 });
  }
}
