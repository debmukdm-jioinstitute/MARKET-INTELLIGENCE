import { getFeedHubCached } from "@/lib/feeds/hub-cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const payload = await getFeedHubCached();
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=20, stale-while-revalidate=45" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Feed hub failed" },
      { status: 500 },
    );
  }
}
