import { buildSectors, type SectorsPayload } from "@/lib/feeds/india/sectors";
import { NextResponse } from "next/server";

export const maxDuration = 30;

let cache: { at: number; payload: SectorsPayload } | null = null;
const TTL = 60_000;

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < TTL) return NextResponse.json(cache.payload);
  try {
    const payload = await buildSectors();
    if (!payload.rows.length) throw new Error("no sector rows");
    cache = { at: now, payload };
    return NextResponse.json(payload);
  } catch {
    if (cache) return NextResponse.json(cache.payload, { headers: { "x-stale": "1" } });
    return NextResponse.json({ error: "Sector feed unavailable" }, { status: 503 });
  }
}
