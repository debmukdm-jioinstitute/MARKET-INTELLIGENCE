import { searchSymbols } from "@/lib/feeds/symbol-search";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ hits: [] });
  }
  try {
    const hits = await searchSymbols(q, 20);
    return NextResponse.json(
      { hits },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Symbol search failed", hits: [] },
      { status: 502 },
    );
  }
}
