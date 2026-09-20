import { fetchYahooHistory } from "@/lib/feeds/sources/yahoo";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const range = (searchParams.get("range") ?? "6mo") as "1mo" | "3mo" | "6mo" | "1y";
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }
  try {
    const points = await fetchYahooHistory(symbol, range);
    return NextResponse.json({ points });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "History failed" },
      { status: 502 },
    );
  }
}
