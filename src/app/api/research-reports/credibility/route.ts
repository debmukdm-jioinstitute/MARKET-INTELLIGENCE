import { buildAnalystCredibility } from "@/lib/research/analyst-credibility";
import { NextResponse } from "next/server";

export const revalidate = 900;
export const maxDuration = 60;

export async function GET(req: Request) {
  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit") ?? 100) || 100, 100);
  try {
    const data = await buildAnalystCredibility(limit);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=900" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Analyst credibility failed" },
      { status: 502 },
    );
  }
}
