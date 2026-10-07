import { NextResponse } from "next/server";
import { getTranscriptArchive } from "@/lib/research/transcript-archive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const symbol = params.get("symbol")?.trim().toUpperCase() ?? "";
  const market = params.get("market")?.toUpperCase() ?? "IN";
  if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol) || !["IN", "US"].includes(market)) {
    return NextResponse.json({ error: "Invalid symbol or market (IN/US)" }, { status: 400 });
  }
  try {
    const data = await getTranscriptArchive(symbol, market as "IN" | "US");
    return NextResponse.json(data, { headers: { "Cache-Control": data.status === "ready" ? "public, s-maxage=900, stale-while-revalidate=3600" : "no-store" } });
  } catch {
    return NextResponse.json({ error: "Transcript archives could not be checked. Please retry shortly." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
