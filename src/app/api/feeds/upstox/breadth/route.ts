import { fetchLiveBreadth } from "@/lib/feeds/india/upstox-breadth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const breadth = await fetchLiveBreadth();
    return NextResponse.json(breadth, {
      headers: { "Cache-Control": "public, max-age=5, stale-while-revalidate=10" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Breadth failed" },
      { status: 502 },
    );
  }
}
